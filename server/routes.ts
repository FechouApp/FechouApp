import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClientSchema, insertQuoteSchema, insertQuoteItemSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updateData = req.body;
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        ...updateData,
        updatedAt: new Date(),
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Client routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { search } = req.query;
      
      let clients;
      if (search) {
        clients = await storage.searchClients(userId, search as string);
      } else {
        clients = await storage.getClients(userId);
      }
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClient(req.params.id, userId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientData = insertClientSchema.parse({ ...req.body, userId });
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientData = insertClientSchema.partial().parse(req.body);
      
      const client = await storage.updateClient(req.params.id, clientData, userId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid client data", errors: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.deleteClient(req.params.id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Quote routes
  app.get('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quotes = await storage.getQuotes(userId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Public quote view (no authentication required)
  app.get('/api/quotes/public/:quoteNumber', async (req, res) => {
    try {
      const { quoteNumber } = req.params;
      const quote = await storage.getQuoteByNumber(quoteNumber);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Mark as viewed if not already
      if (!quote.viewedAt) {
        await storage.updateQuoteStatus(quote.id, quote.status, { viewedAt: new Date() });
      }

      res.json(quote);
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Approve quote (public)
  app.post('/api/quotes/:id/approve', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.updateQuoteStatus(id, 'approved', { 
        approvedAt: new Date() 
      });
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json({ message: "Quote approved successfully" });
    } catch (error) {
      console.error("Error approving quote:", error);
      res.status(500).json({ message: "Failed to approve quote" });
    }
  });

  // Reject quote (public)
  app.post('/api/quotes/:id/reject', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const success = await storage.updateQuoteStatus(id, 'rejected', { 
        rejectedAt: new Date(),
        rejectionReason: reason || null
      });
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json({ message: "Quote rejected successfully" });
    } catch (error) {
      console.error("Error rejecting quote:", error);
      res.status(500).json({ message: "Failed to reject quote" });
    }
  });

  app.get('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quote = await storage.getQuote(req.params.id, userId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Public quote view (no authentication required)
  app.get('/api/quotes/public/:quoteNumber', async (req, res) => {
    try {
      const quote = await storage.getQuoteByNumber(req.params.quoteNumber);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Update quote status to viewed if not already
      if (quote.status === 'SENT') {
        await storage.updateQuoteStatus(quote.id, 'VIEWED');
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quote: quoteData, items } = req.body;
      
      const parsedQuote = insertQuoteSchema.parse({ ...quoteData, userId });
      const parsedItems = z.array(insertQuoteItemSchema).parse(items);
      
      const quote = await storage.createQuote(parsedQuote, parsedItems);
      
      // Update user's monthly quote count
      const user = await storage.getUser(userId);
      if (user) {
        await storage.upsertUser({
          ...user,
          monthlyQuotes: user.monthlyQuotes + 1,
        });
      }
      
      res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      }
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.put('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteData = insertQuoteSchema.partial().parse(req.body);
      
      const quote = await storage.updateQuote(req.params.id, quoteData, userId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      }
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.deleteQuote(req.params.id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Quote status updates
  app.patch('/api/quotes/:id/status', async (req, res) => {
    try {
      const { status, metadata } = req.body;
      const success = await storage.updateQuoteStatus(req.params.id, status, metadata);
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating quote status:", error);
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  // Review routes
  app.get('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reviews = await storage.getReviews(userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/reviews', async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.put('/api/reviews/:id/response', isAuthenticated, async (req: any, res) => {
    try {
      const { response } = req.body;
      const review = await storage.updateReview(req.params.id, {
        response,
        respondedAt: new Date(),
      });
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      res.json(review);
    } catch (error) {
      console.error("Error updating review response:", error);
      res.status(500).json({ message: "Failed to update review response" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.markNotificationAsRead(req.params.id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // User plan update
  app.patch('/api/user/plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.upsertUser({
        ...user,
        plan,
        planExpiresAt: plan === 'PREMIUM' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        quotesLimit: plan === 'PREMIUM' ? 999999 : 5,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ message: "Failed to update user plan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
