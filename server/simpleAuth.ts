import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Simple authentication without complex OIDC
export function setupSimpleAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  }));

  // Simple login route that creates a user session
  app.get("/api/login", async (req: any, res) => {
    try {
      // Create or get a demo user for testing
      const demoUserId = "demo-user-123";
      const user = await storage.upsertUser({
        id: demoUserId,
        email: "demo@fechou.com",
        firstName: "Demo",
        lastName: "User",
        profileImageUrl: null,
      });

      // Set user session
      req.session.user = {
        id: demoUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      res.redirect("/");
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout route
  app.get("/api/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Add user to request object
  req.user = {
    claims: {
      sub: req.session.user.id
    }
  };

  next();
};