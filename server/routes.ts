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

      // Generate WhatsApp message with public PDF URL (no authentication required)
      const pdfUrl = `${req.protocol}://${req.get('host')}/api/public-quotes/${quoteWithItems.quoteNumber}/receipt/pdf`;
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

  // Public endpoints for receipts (no authentication required)
  app.get('/api/public-quotes/:quoteNumber/receipt', async (req, res) => {
    try {
      const { quoteNumber } = req.params;
      
      const quote = await storage.getQuoteByNumber(quoteNumber);
      if (!quote) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      // Only allow access to paid quotes
      if (quote.status !== 'paid') {
        return res.status(400).json({ message: "Recibo disponível apenas para orçamentos pagos" });
      }

      const quoteWithItems = await storage.getQuote(quote.id, quote.userId);
      if (!quoteWithItems) {
        return res.status(404).json({ message: "Detalhes do orçamento não encontrados" });
      }

      res.json(quoteWithItems);
    } catch (error) {
      console.error("Error fetching public receipt:", error);
      res.status(500).json({ message: "Erro ao acessar recibo" });
    }
  });

  // Public route to redirect to receipt PDF page
  app.get('/api/public-quotes/:quoteNumber/receipt/pdf', async (req, res) => {
    try {
      const { quoteNumber } = req.params;
      
      const quote = await storage.getQuoteByNumber(quoteNumber);
      if (!quote) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      // Only allow PDF generation for paid quotes
      if (quote.status !== 'paid') {
        return res.status(400).json({ message: "Recibo disponível apenas para orçamentos pagos" });
      }

      // Redirect to frontend page that generates PDF
      const frontendUrl = `/receipt/${quoteNumber}/pdf`;
      res.redirect(frontendUrl);
    } catch (error) {
      console.error("Error redirecting to receipt PDF:", error);
      res.status(500).json({ message: "Erro ao acessar recibo" });
    }
  });

  // Public route to get user data for receipt generation
  app.get('/api/public-users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return only necessary data for PDF generation
      const publicUserData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: user.businessName,
        plan: user.plan,
        ...(user as any).address && { address: (user as any).address },
        ...(user as any).number && { number: (user as any).number },
        ...(user as any).city && { city: (user as any).city },
        ...(user as any).state && { state: (user as any).state },
        ...(user as any).cep && { cep: (user as any).cep },
        ...(user as any).cpfCnpj && { cpfCnpj: (user as any).cpfCnpj },
        ...(user as any).phone && { phone: (user as any).phone },
        ...(user as any).logoUrl && { logoUrl: (user as any).logoUrl },
      };
      
      res.json(publicUserData);
    } catch (error) {
      console.error("Error fetching public user data:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  const server = createServer(app);
  return server;
}