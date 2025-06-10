import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClientSchema, insertQuoteSchema, insertQuoteItemSchema, insertReviewSchema, insertSavedItemSchema } from "@shared/schema";
import { z } from "zod";
import "./types";

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

  // Get receipt data for paid quote (authenticated)
  app.get('/api/quotes/:id/receipt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const quote = await storage.getQuoteById(id);
      if (!quote) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      if (quote.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Only allow receipt view for paid quotes
      if (quote.status !== 'paid') {
        return res.status(400).json({ message: "Recibo disponível apenas para orçamentos pagos" });
      }

      // Get the quote with items using the quote owner's userId
      const quoteWithItems = await storage.getQuote(id, quote.userId);
      if (!quoteWithItems) {
        return res.status(404).json({ message: "Detalhes do orçamento não encontrados" });
      }

      res.json(quoteWithItems);
    } catch (error) {
      console.error("Error fetching receipt:", error);
      res.status(500).json({ message: "Erro ao buscar recibo" });
    }
  });

  // Generate WhatsApp link for receipt sharing
  app.get('/api/quotes/:id/receipt/whatsapp', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const quote = await storage.getQuoteById(id);
      if (!quote) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      if (quote.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      if (quote.status !== 'paid') {
        return res.status(400).json({ message: "Recibo disponível apenas para orçamentos pagos" });
      }

      const quoteWithItems = await storage.getQuote(id, quote.userId);
      if (!quoteWithItems || !quoteWithItems.client.phone) {
        return res.status(400).json({ message: "Número do cliente não encontrado" });
      }

      // Generate WhatsApp message with frontend PDF URL that works on mobile
      const pdfUrl = `${req.protocol}://${req.get('host')}/receipt/${quoteWithItems.quoteNumber}/pdf`;
      const message = `Olá ${quoteWithItems.client.name}! Segue o recibo do pagamento do seu orçamento.
      
📄 Recibo Nº: ${quoteWithItems.quoteNumber}
💰 Valor: R$ ${parseFloat(quoteWithItems.total).toFixed(2)}
📅 Data: ${new Date().toLocaleDateString('pt-BR')}

🔗 Baixar recibo: ${pdfUrl}

Obrigado pela confiança!`;

      // Clean phone number and generate WhatsApp link
      const cleanPhone = quoteWithItems.client.phone.replace(/\D/g, '');
      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      res.json({ whatsappLink, message });
    } catch (error) {
      console.error("Error generating WhatsApp link:", error);
      res.status(500).json({ message: "Erro ao gerar link do WhatsApp" });
    }
  });

  // Clients routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientData = insertClientSchema.parse({ ...req.body, userId });
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Quotes routes
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

  app.post('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteData = insertQuoteSchema.parse({ ...req.body, userId });
      const quote = await storage.createQuote(quoteData);
      res.json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.put('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteData = insertQuoteSchema.parse({ ...req.body, userId });
      const quote = await storage.updateQuote(req.params.id, quoteData, userId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteQuote(req.params.id, userId);
      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Quote Items routes
  app.post('/api/quotes/:quoteId/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemData = insertQuoteItemSchema.parse({ ...req.body, quoteId: req.params.quoteId });
      const item = await storage.createQuoteItem(itemData, userId);
      res.json(item);
    } catch (error) {
      console.error("Error creating quote item:", error);
      res.status(500).json({ message: "Failed to create quote item" });
    }
  });

  app.put('/api/quotes/:quoteId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemData = insertQuoteItemSchema.parse({ ...req.body, quoteId: req.params.quoteId });
      const item = await storage.updateQuoteItem(req.params.itemId, itemData, userId);
      if (!item) {
        return res.status(404).json({ message: "Quote item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating quote item:", error);
      res.status(500).json({ message: "Failed to update quote item" });
    }
  });

  app.delete('/api/quotes/:quoteId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteQuoteItem(req.params.itemId, userId);
      res.json({ message: "Quote item deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote item:", error);
      res.status(500).json({ message: "Failed to delete quote item" });
    }
  });

  // Update quote status
  app.patch('/api/quotes/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;
      const quote = await storage.updateQuoteStatus(req.params.id, status, userId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error updating quote status:", error);
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Reviews routes
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

  app.post('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reviewData = insertReviewSchema.parse({ ...req.body, userId });
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Saved items routes
  app.get('/api/saved-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedItems = await storage.getSavedItems(userId);
      res.json(savedItems);
    } catch (error) {
      console.error("Error fetching saved items:", error);
      res.status(500).json({ message: "Failed to fetch saved items" });
    }
  });

  app.post('/api/saved-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemData = insertSavedItemSchema.parse({ ...req.body, userId });
      const savedItem = await storage.createSavedItem(itemData);
      res.json(savedItem);
    } catch (error) {
      console.error("Error creating saved item:", error);
      res.status(500).json({ message: "Failed to create saved item" });
    }
  });

  app.delete('/api/saved-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteSavedItem(req.params.id, userId);
      res.json({ message: "Saved item deleted successfully" });
    } catch (error) {
      console.error("Error deleting saved item:", error);
      res.status(500).json({ message: "Failed to delete saved item" });
    }
  });

  const server = createServer(app);
  return server;
}