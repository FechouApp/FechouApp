import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClientSchema, insertQuoteSchema, insertQuoteItemSchema, insertReviewSchema, insertSavedItemSchema, insertQuoteItemWithoutQuoteIdSchema } from "@shared/schema";
import { z } from "zod";
import "./types";

// Admin middleware
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking admin status" });
  }
};

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

  // Update user profile
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

  // User profile endpoint (POST for onboarding compatibility)
  app.post('/api/user/profile', isAuthenticated, async (req: any, res) => {
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
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: any, res) => {
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

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.patch('/api/admin/users/:userId/plan', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { plan, paymentStatus, paymentMethod, customExpiryDate } = req.body;

      console.log("Updating user plan:", { userId, plan, paymentStatus, paymentMethod, customExpiryDate });

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let planExpiresAt = null;
      
      // Regras de expiração dos planos
      if (plan === "PREMIUM") {
        // Se não há data customizada, Premium ativo sem expiração (renovação automática)
        if (!customExpiryDate) {
          planExpiresAt = null; // Sem expiração para renovação automática
        } else {
          // Cancelamento manual com data específica
          planExpiresAt = new Date(customExpiryDate);
        }
      } else if (plan === "PREMIUM_CORTESIA") {
        // Premium cortesia: sem expiração (null)
        planExpiresAt = null;
      } else if (plan === "FREE") {
        // Plano gratuito: sem expiração
        planExpiresAt = null;
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        plan,
        paymentStatus: paymentStatus || "ativo",
        paymentMethod,
        planExpiresAt,
        updatedAt: new Date(),
      });

      console.log("User plan updated successfully:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ message: "Failed to update user plan" });
    }
  });

  // Endpoint para cancelamento manual de plano premium
  app.patch('/api/admin/users/:userId/cancel', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { cancelDate } = req.body;

      console.log("Canceling user plan:", { userId, cancelDate });

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.plan !== "PREMIUM") {
        return res.status(400).json({ message: "Only Premium plans can be cancelled" });
      }

      const updatedUser = await storage.upsertUser({
        id: userId,
        planExpiresAt: new Date(cancelDate),
        paymentStatus: "cancelado",
        updatedAt: new Date(),
      });

      console.log("User plan cancelled successfully:", updatedUser);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error cancelling user plan:", error);
      res.status(500).json({ message: "Failed to cancel user plan" });
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

Obrigado pela confiança!

_Gerado pelo Fechou! - www.meufechou.com.br_`;

      // Clean phone number and generate WhatsApp link
      const cleanPhone = quoteWithItems.client.phone.replace(/\D/g, '');
      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      res.json({ whatsappLink, message });
    } catch (error) {
      console.error("Error generating WhatsApp link:", error);
      res.status(500).json({ message: "Erro ao gerar link do WhatsApp" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User plan limits
  app.get('/api/user/plan-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get fresh user stats (which includes auto-reset check)
      await storage.getUserStats(userId);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verificar se o plano expirou
      const isExpired = user.planExpiresAt && new Date() > user.planExpiresAt;
      
      // Se o plano premium expirou, revertê-lo automaticamente para FREE
      if (user.plan === "PREMIUM" && isExpired) {
        await storage.upsertUser({
          id: userId,
          plan: "FREE",
          planExpiresAt: null,
          paymentStatus: "vencido",
          updatedAt: new Date(),
        });
        user.plan = "FREE";
        user.planExpiresAt = null;
      }

      // Determinar se o usuário tem acesso premium
      const hasPremiumAccess = user.plan === "PREMIUM_CORTESIA" || 
                              (user.plan === "PREMIUM" && !isExpired);

      let monthlyQuoteLimit, itemsPerQuoteLimit;

      if (hasPremiumAccess) {
        monthlyQuoteLimit = null; // Unlimited
        itemsPerQuoteLimit = null; // Unlimited
      } else {
        // Plano gratuito: 5 orçamentos base + orçamentos bônus de indicações
        const baseLimit = user.quotesLimit || 5;
        const bonusQuotes = user.bonusQuotes || 0;
        monthlyQuoteLimit = baseLimit + bonusQuotes;
        itemsPerQuoteLimit = 10;
      }

      const currentMonthQuotes = user.quotesUsedThisMonth || 0;
      const canCreateQuote = hasPremiumAccess || currentMonthQuotes < (monthlyQuoteLimit || 0);

      const response = {
        plan: user.plan,
        isPremium: hasPremiumAccess,
        isExpired: isExpired && user.plan === "PREMIUM",
        planExpiresAt: user.planExpiresAt,
        monthlyQuoteLimit,
        itemsPerQuoteLimit,
        currentMonthQuotes,
        canCreateQuote,
        bonusQuotes: user.bonusQuotes || 0,
        referralCount: user.referralCount || 0
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching plan limits:", error);
      res.status(500).json({ message: "Failed to fetch plan limits" });
    }
  });

  // Clients routes
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

  // Public quote view (no authentication required) - MUST come before /api/quotes/:id
  app.get('/api/quotes/public/:quoteNumber', async (req, res) => {
    try {
      const { quoteNumber } = req.params;
      // Try both uppercase and lowercase for backward compatibility
      let quote = await storage.getQuoteByNumber(quoteNumber.toUpperCase());
      if (!quote) {
        quote = await storage.getQuoteByNumber(quoteNumber.toLowerCase());
      }

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

  // Get individual quote for editing (authenticated)
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

  // Create new quote with comprehensive validation
  app.post("/api/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const { quote, items } = req.body;
      const userId = req.user.claims.sub;

      // Verificar se o plano permite criar mais orçamentos
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`Plan limits for user ${userId}:`, {
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        quotesUsedThisMonth: user.quotesUsedThisMonth
      });

      const isPremium = user.plan === "PREMIUM" || user.plan === "PREMIUM_CORTESIA";
      const isExpired = user.planExpiresAt && new Date() > user.planExpiresAt;

      let monthlyQuoteLimit, itemsPerQuoteLimit;

      // PREMIUM_CORTESIA nunca expira
      if (user.plan === "PREMIUM_CORTESIA" || (isPremium && !isExpired)) {
        monthlyQuoteLimit = null; // Unlimited
        itemsPerQuoteLimit = null; // Unlimited
      } else {
        // Plano gratuito: 5 orçamentos base + orçamentos bônus de indicações
        const baseLimit = user.quotesLimit || 5;
        const bonusQuotes = user.bonusQuotes || 0;
        monthlyQuoteLimit = baseLimit + bonusQuotes;
        itemsPerQuoteLimit = 10;
      }

      // Check current month usage
      const currentMonthQuotes = user.quotesUsedThisMonth || 0;

      // Check if user can create more quotes
      if (monthlyQuoteLimit !== null && currentMonthQuotes >= monthlyQuoteLimit) {
        return res.status(403).json({
          message: `Limite de ${monthlyQuoteLimit} orçamentos mensais atingido. Atualize para Premium para orçamentos ilimitados.`,
          upgradeRequired: true
        });
      }

      // Check items limit for free plan
      if (itemsPerQuoteLimit !== null && items && items.length > itemsPerQuoteLimit) {
        return res.status(403).json({
          message: `Plano gratuito permite até ${itemsPerQuoteLimit} itens por orçamento. Atualize para Premium para itens ilimitados.`,
          upgradeRequired: true
        });
      }

      // Validate quote data
      const quoteData = insertQuoteSchema.parse({
        ...quote,
        userId,
      });

      // Validate items
      const validatedItems = items?.map((item: any) =>
        insertQuoteItemWithoutQuoteIdSchema.parse(item)
      ) || [];

      console.log("Creating quote with data:", { quoteData, itemsCount: validatedItems.length });

      // Create quote with items
      const createdQuote = await storage.createQuote(quoteData, validatedItems);

      console.log("Quote created successfully:", createdQuote.id);
      res.status(201).json(createdQuote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error creating quote:", error.errors);
        return res.status(400).json({
          message: "Dados do orçamento inválidos",
          errors: error.errors
        });
      }
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.put('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { items, ...quote } = req.body;
      const id = req.params.id;

      // Verificar se o orçamento existe e pertence ao usuário
      const existingQuote = await storage.getQuote(id, userId);
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Serializar fotos para JSON string se existirem
      const quoteData = { ...quote };
      if (quote.photos && Array.isArray(quote.photos)) {
        quoteData.photos = JSON.stringify(quote.photos);
      }

      // Atualizar o orçamento
      const updatedQuote = await storage.updateQuote(id, quoteData, userId);

      if (!updatedQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Deletar itens existentes e criar novos
      await storage.deleteQuoteItems(id);
      if (items && items.length > 0) {
        await storage.createQuoteItems(items.map((item: any) => ({
          ...item,
          quoteId: id,
        })));
      }

      // Retornar o orçamento atualizado com os itens
      const completeQuote = await storage.getQuote(id, userId);
      res.json(completeQuote);
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

  // Approve quote (public)
  app.patch('/api/quotes/:id/approve', async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Approving quote:", id);

      // Get quote first to validate it exists and check if it can be approved
      const quote = await storage.getQuoteById(id);
      if (!quote) {
        console.log("Quote not found for approval:", id);
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      // Check if quote is still pending and not expired
      if (quote.status !== 'pending') {
        return res.status(400).json({ message: "Este orçamento não pode ser aprovado" });
      }

      const isExpired = new Date(quote.validUntil) < new Date();
      if (isExpired) {
        return res.status(400).json({ message: "Este orçamento expirou e não pode ser aprovado" });
      }

      const success = await storage.updateQuoteStatus(id, 'approved', { 
        approvedAt: new Date() 
      });

      if (!success) {
        console.log("Failed to update quote status for approval:", id);
        return res.status(500).json({ message: "Erro ao aprovar orçamento" });
      }

      // Create notification for quote approval
      try {
        await storage.createNotification({
          userId: quote.userId,
          title: "Orçamento Aprovado",
          message: `Seu orçamento ${quote.quoteNumber} foi aprovado pelo cliente!`,
          type: "QUOTE_APPROVED",
          data: { quoteId: quote.id, quoteNumber: quote.quoteNumber },
          isRead: false,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't fail the approval if notification fails
      }

      console.log("Quote approved successfully:", id);
      res.json({ message: "Orçamento aprovado com sucesso!", status: "approved" });
    } catch (error) {
      console.error("Error approving quote:", error);
      res.status(500).json({ message: "Não foi possível aprovar o orçamento" });
    }
  });

  // Reject quote (public)
  app.patch('/api/quotes/:id/reject', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      console.log("Rejecting quote:", id, "with reason:", reason);

      // Get quote first to validate it exists and check if it can be rejected
      const quote = await storage.getQuoteById(id);
      if (!quote) {
        console.log("Quote not found for rejection:", id);
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      // Check if quote is still pending
      if (quote.status !== 'pending') {
        return res.status(400).json({ message: "Este orçamento não pode ser rejeitado" });
      }

      const success = await storage.updateQuoteStatus(id, 'rejected', { 
        rejectedAt: new Date(),
        rejectionReason: reason || null
      });

      if (!success) {
        console.log("Failed to update quote status for rejection:", id);
        return res.status(500).json({ message: "Erro ao rejeitar orçamento" });
      }

      // Create notification for quote rejection
      try {
        await storage.createNotification({
          userId: quote.userId,
          title: "Orçamento Rejeitado",
          message: `Seu orçamento ${quote.quoteNumber} foi rejeitado pelo cliente.${reason ? ` Motivo: ${reason}` : ''}`,
          type: "QUOTE_REJECTED",
          data: { quoteId: quote.id, quoteNumber: quote.quoteNumber, reason },
          isRead: false,
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't fail the rejection if notification fails
      }

      console.log("Quote rejected successfully:", id);
      res.json({ message: "Orçamento rejeitado com sucesso!", status: "rejected" });
    } catch (error) {
      console.error("Error rejecting quote:", error);
      res.status(500).json({ message: "Não foi possível rejeitar o orçamento" });
    }
  });

  // Confirm payment (authenticated)
  app.patch('/api/quotes/:id/confirm-payment', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      console.log("Confirming payment for quote:", id);

      // Check if user has Premium plan for receipt functionality
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const isPremium = user.plan === "PREMIUM" || user.plan === "PREMIUM_CORTESIA";
      const isExpired = user.planExpiresAt && new Date() > user.planExpiresAt;
      
      if (!isPremium || isExpired) {
        return res.status(403).json({ message: "Funcionalidade de recibos disponível apenas para usuários Premium" });
      }

      // Get quote first to validate it exists and belongs to user
      const quote = await storage.getQuoteById(id);
      if (!quote) {
        console.log("Quote not found for payment confirmation:", id);
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      // Check if quote belongs to the authenticated user
      if (quote.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Auto-approve quote if it's pending before marking as paid
      if (quote.status === 'pending') {
        console.log("Auto-approving pending quote before payment confirmation");
        await storage.updateQuoteStatus(id, 'approved');
      } else if (quote.status !== 'approved') {
        return res.status(400).json({ message: "Apenas orçamentos pendentes ou aprovados podem ter pagamento confirmado" });
      }

      const success = await storage.updateQuoteStatus(id, 'paid', { 
        paidAt: new Date() 
      });

      if (!success) {
        console.log("Failed to update quote status to paid:", id);
        return res.status(500).json({ message: "Erro ao confirmar pagamento" });
      }

      console.log("Payment confirmed successfully for quote:", id);
      res.json({ message: "Pagamento confirmado com sucesso!", status: "paid" });
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ message: "Não foi possível confirmar pagamento" });
    }
  });

  // Quote Items routes
  app.post('/api/quotes/:quoteId/items', isAuthenticated, async (req: any, res) => {
    try {
      const itemData = insertQuoteItemSchema.parse({ ...req.body, quoteId: req.params.quoteId });
      const item = await storage.createQuoteItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating quote item:", error);
      res.status(500).json({ message: "Failed to create quote item" });
    }
  });

  app.put('/api/quotes/:quoteId/items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const itemData = insertQuoteItemSchema.parse({ ...req.body, quoteId: req.params.quoteId });
      const item = await storage.updateQuoteItem(req.params.itemId, itemData);
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
      await storage.deleteQuoteItem(req.params.itemId);
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

  // Mark quote as sent via WhatsApp
  app.post('/api/quotes/:id/mark-sent', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      console.log("Marking quote as sent:", id);

      // Get quote first to validate it exists and belongs to user
      const quote = await storage.getQuoteById(id);
      if (!quote) {
        console.log("Quote not found for mark-sent:", id);
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }

      // Check if quote belongs to the authenticated user
      if (quote.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Update quote status to pending and mark as sent
      const success = await storage.updateQuoteStatus(id, 'pending', { 
        sentViaWhatsApp: true,
        sentAt: new Date()
      });

      if (!success) {
        console.log("Failed to update quote status to sent:", id);
        return res.status(500).json({ message: "Erro ao marcar orçamento como enviado" });
      }

      console.log("Quote marked as sent successfully:", id);
      res.json({ message: "Orçamento marcado como enviado com sucesso!", status: "pending" });
    } catch (error) {
      console.error("Error marking quote as sent:", error);
      res.status(500).json({ message: "Não foi possível marcar orçamento como enviado" });
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

  // Public route to serve receipt PDF page directly
  app.get('/api/public-quotes/:quoteNumber/receipt/pdf', async (req, res) => {
    try {
      const { quoteNumber } = req.params;
      
      const quote = await storage.getQuoteByNumber(quoteNumber);
      if (!quote) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Recibo não encontrado</title>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Recibo não encontrado</h2>
            <p>Este recibo não existe ou não está disponível.</p>
          </body>
          </html>
        `);
      }

      // Only allow PDF generation for paid quotes
      if (quote.status !== 'paid') {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Recibo não disponível</title>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Recibo não disponível</h2>
            <p>O recibo só está disponível para orçamentos pagos.</p>
          </body>
          </html>
        `);
      }

      // Serve HTML page that will generate and download PDF automatically
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gerando Recibo...</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background-color: #f5f5f5;
            }
            .loader {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 2s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <h2>Gerando recibo...</h2>
          <div class="loader"></div>
          <p>O download do recibo será iniciado automaticamente.</p>
          <script>
            // Redirect to the React app page that handles PDF generation
            window.location.href = '${req.protocol}://${req.get('host')}/receipt/${quoteNumber}/pdf';
          </script>
        </body>
        </html>
      `;
      
      res.send(htmlResponse);
    } catch (error) {
      console.error("Error serving receipt PDF page:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro</title>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Erro ao acessar recibo</h2>
          <p>Ocorreu um erro ao tentar acessar o recibo.</p>
        </body>
        </html>
      `);
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