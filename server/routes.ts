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

  const server = createServer(app);
  return server;
}