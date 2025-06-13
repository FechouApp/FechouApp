import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireAdmin, type AuthenticatedRequest } from "./middleware/auth";
import authRoutes from "./routes/auth";
import { insertClientSchema, insertQuoteSchema, insertQuoteItemSchema, insertReviewSchema, insertSavedItemSchema, insertQuoteItemWithoutQuoteIdSchema } from "@shared/schema";
import { z } from "zod";
import "./types";

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase Auth routes
  app.use('/api/auth', authRoutes);

  // Get user by ID (for PIX key retrieval)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile - Firebase optimized
  app.put('/api/auth/user', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const updateData = req.body;

      const updatedUser = await storage.updateUser(userId, {
        ...updateData,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // User profile endpoint (POST for onboarding compatibility)
  app.post('/api/user/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const updateData = req.body;

      const updatedUser = await storage.upsertUser({
        id: userId,
        ...updateData,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch('/api/auth/user', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const updateData = req.body;

      const updatedUser = await storage.updateUser(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin: Get all users
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Update user plan
  app.patch('/api/admin/users/:id/plan', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { plan, paymentStatus, paymentMethod } = req.body;
      
      const updatedUser = await storage.updateUserPlanStatus(id, plan, paymentStatus, paymentMethod);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ message: "Failed to update user plan" });
    }
  });

  // Admin: Reset monthly quotes
  app.patch('/api/admin/users/:id/reset-quotes', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      const updatedUser = await storage.resetMonthlyQuotes(id);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error resetting quotes:", error);
      res.status(500).json({ message: "Failed to reset quotes" });
    }
  });

  // Admin: Get admin statistics
  app.get('/api/admin/stats', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Clients API
  app.get('/api/clients', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const clientData = insertClientSchema.parse({ ...req.body, userId });
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.get('/api/clients/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
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

  app.put('/api/clients/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const clientData = req.body;
      const updatedClient = await storage.updateClient(req.params.id, clientData, userId);
      if (!updatedClient) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const success = await storage.deleteClient(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  app.get('/api/clients/search/:term', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const searchTerm = req.params.term;
      const clients = await storage.searchClients(userId, searchTerm);
      res.json(clients);
    } catch (error) {
      console.error("Error searching clients:", error);
      res.status(500).json({ message: "Failed to search clients" });
    }
  });

  // Quotes API
  app.get('/api/quotes', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const quotes = await storage.getQuotes(userId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.post('/api/quotes', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const { quote, items } = req.body;
      
      const quoteData = insertQuoteSchema.parse({ ...quote, userId });
      const itemsData = items.map((item: any) => insertQuoteItemWithoutQuoteIdSchema.parse(item));
      
      const newQuote = await storage.createQuote(quoteData, itemsData);
      res.json(newQuote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.get('/api/quotes/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
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

  app.put('/api/quotes/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const quoteData = req.body;
      const updatedQuote = await storage.updateQuote(req.params.id, quoteData, userId);
      if (!updatedQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete('/api/quotes/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const success = await storage.deleteQuote(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Public quote access
  app.get('/api/public/quotes/:quoteNumber', async (req, res) => {
    try {
      const quote = await storage.getQuoteByNumber(req.params.quoteNumber);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Quote status update
  app.patch('/api/quotes/:id/status', async (req, res) => {
    try {
      const { status, metadata } = req.body;
      const success = await storage.updateQuoteStatus(req.params.id, status, metadata);
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json({ message: "Quote status updated successfully" });
    } catch (error) {
      console.error("Error updating quote status:", error);
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  // Reviews API
  app.get('/api/reviews', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
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
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Saved Items API
  app.get('/api/saved-items', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const savedItems = await storage.getSavedItems(userId);
      res.json(savedItems);
    } catch (error) {
      console.error("Error fetching saved items:", error);
      res.status(500).json({ message: "Failed to fetch saved items" });
    }
  });

  app.post('/api/saved-items', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const savedItemData = insertSavedItemSchema.parse({ ...req.body, userId });
      const savedItem = await storage.createSavedItem(savedItemData);
      res.json(savedItem);
    } catch (error) {
      console.error("Error creating saved item:", error);
      res.status(500).json({ message: "Failed to create saved item" });
    }
  });

  app.put('/api/saved-items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const savedItemData = req.body;
      const updatedSavedItem = await storage.updateSavedItem(req.params.id, savedItemData, userId);
      if (!updatedSavedItem) {
        return res.status(404).json({ message: "Saved item not found" });
      }
      res.json(updatedSavedItem);
    } catch (error) {
      console.error("Error updating saved item:", error);
      res.status(500).json({ message: "Failed to update saved item" });
    }
  });

  app.delete('/api/saved-items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const success = await storage.deleteSavedItem(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Saved item not found" });
      }
      res.json({ message: "Saved item deleted successfully" });
    } catch (error) {
      console.error("Error deleting saved item:", error);
      res.status(500).json({ message: "Failed to delete saved item" });
    }
  });

  // Statistics API
  app.get('/api/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Referrals API
  app.get('/api/referrals', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const referrals = await storage.getReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  // User activity logs
  app.get('/api/user/activity', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.firebaseUser!.uid;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getUserActivity(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}