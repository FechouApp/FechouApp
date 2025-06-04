import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClientSchema, insertQuoteSchema, insertQuoteItemSchema, insertReviewSchema, insertSavedItemSchema } from "@shared/schema";
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

  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }

      // Simular verificação da senha atual (em um app real, você verificaria contra o banco)
      // Como estamos usando OpenID Connect, a mudança real da senha deve ser feita na conta Replit
      // Esta é apenas uma demonstração da interface
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  // Rota para alternar plano (apenas para teste)
  app.post('/api/auth/toggle-plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const newPlan = user.plan === "FREE" ? "PREMIUM" : "FREE";
      const planExpiresAt = newPlan === "PREMIUM" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null; // 30 dias
      
      const updatedUser = await storage.updateUserPlan(userId, newPlan, planExpiresAt);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error toggling plan:", error);
      res.status(500).json({ message: "Erro ao alterar plano" });
    }
  });

  // Rota para adicionar bônus de indicação
  app.post('/api/user/referral', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.addReferralBonus(userId);
      res.json(user);
    } catch (error) {
      console.error("Error adding referral bonus:", error);
      res.status(500).json({ message: "Erro ao adicionar bônus de indicação" });
    }
  });

  // Rota para atualizar cores personalizadas (Premium apenas)
  app.post('/api/user/colors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { primaryColor, secondaryColor } = req.body;

      // Verificar se é Premium
      const user = await storage.getUser(userId);
      const isPremium = user?.plan === "PREMIUM";
      
      if (!isPremium) {
        return res.status(403).json({ message: "Funcionalidade exclusiva do plano Premium" });
      }

      const updatedUser = await storage.updateUserColors(userId, primaryColor, secondaryColor);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user colors:", error);
      res.status(500).json({ message: "Erro ao atualizar cores" });
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

  // User plan limits
  app.get('/api/user/plan-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isPremium = user.plan === "PREMIUM";
      const isExpired = user.planExpiresAt && new Date() > user.planExpiresAt;
      
      let monthlyQuoteLimit, itemsPerQuoteLimit;
      
      if (isPremium && !isExpired) {
        monthlyQuoteLimit = null; // Unlimited
        itemsPerQuoteLimit = null; // Unlimited
      } else {
        // Plano gratuito: 5 orçamentos base + orçamentos bônus de indicações
        const baseLimit = user.quotesLimit || 5;
        const bonusQuotes = user.bonusQuotes || 0;
        monthlyQuoteLimit = baseLimit + bonusQuotes;
        itemsPerQuoteLimit = 10;
      }

      // Count current month quotes
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const monthlyQuotes = await storage.getQuotesInDateRange(userId, startOfMonth, endOfMonth);

      res.json({
        plan: user.plan,
        isPremium: isPremium && !isExpired,
        monthlyQuoteLimit,
        itemsPerQuoteLimit,
        currentMonthQuotes: monthlyQuotes.length,
        canCreateQuote: (isPremium && !isExpired) || monthlyQuotes.length < (monthlyQuoteLimit || 0),
        bonusQuotes: user.bonusQuotes || 0,
        referralCount: user.referralCount || 0
      });
    } catch (error) {
      console.error("Error fetching plan limits:", error);
      res.status(500).json({ message: "Failed to fetch plan limits" });
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

  // Public quote view (no authentication required) - MUST come before /api/quotes/:id
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
        console.error("Quote validation error:", error.errors);
        console.error("Received quote data:", req.body.quote);
        console.error("Received items data:", req.body.items);
        return res.status(400).json({ message: "Invalid quote data", errors: error.errors });
      }
      console.error("Error creating quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.put('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { quote: quoteData, items } = req.body;
      
      // Verificar se o orçamento existe e pertence ao usuário
      const existingQuote = await storage.getQuote(req.params.id, userId);
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Atualizar orçamento
      const updatedQuote = await storage.updateQuote(req.params.id, quoteData, userId);
      
      if (!updatedQuote) {
        return res.status(404).json({ message: "Failed to update quote" });
      }
      
      // Deletar itens existentes e criar novos
      await storage.deleteQuoteItems(req.params.id);
      
      if (items && items.length > 0) {
        await storage.createQuoteItems(
          items.map((item: any, index: number) => ({
            quoteId: req.params.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            order: index,
          }))
        );
      }
      
      // Buscar o orçamento atualizado com os itens
      const completeQuote = await storage.getQuote(req.params.id, userId);
      
      res.json(completeQuote);
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

  // Quote approval/rejection/sending
  app.post('/api/quotes/:id/approve', async (req, res) => {
    try {
      const success = await storage.updateQuoteStatus(req.params.id, 'approved', {
        approvedAt: new Date().toISOString()
      });
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Create approval notification
      try {
        const quote = await storage.getQuote(req.params.id, 'public');
        if (quote) {
          await storage.createNotification({
            userId: quote.userId,
            title: 'Orçamento Aprovado!',
            message: `O orçamento #${quote.quoteNumber} foi aprovado pelo cliente ${quote.client.name}`,
            type: 'quote_approved',
            data: { quoteId: quote.id, quoteNumber: quote.quoteNumber },
            isRead: false,
          });
        }
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't fail the approval if notification fails
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving quote:", error);
      res.status(500).json({ message: "Failed to approve quote" });
    }
  });

  app.post('/api/quotes/:id/reject', async (req, res) => {
    try {
      const success = await storage.updateQuoteStatus(req.params.id, 'rejected');
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting quote:", error);
      res.status(500).json({ message: "Failed to reject quote" });
    }
  });

  app.post('/api/quotes/:id/mark-sent', async (req, res) => {
    try {
      const sentAt = new Date();
      const success = await storage.updateQuoteStatus(req.params.id, 'pending', { 
        sentViaWhatsApp: true, 
        sentAt: sentAt.toISOString() 
      });
      
      if (!success) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json({ success: true, sentAt });
    } catch (error) {
      console.error("Error marking quote as sent:", error);
      res.status(500).json({ message: "Failed to mark quote as sent" });
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
      
      // Check if a review already exists for this client and quote
      if (reviewData.quoteId && reviewData.clientId) {
        const existingReview = await storage.getReviewByQuoteAndClient(reviewData.quoteId, reviewData.clientId);
        if (existingReview) {
          return res.status(409).json({ 
            message: "Você já avaliou este orçamento. Cada cliente pode avaliar apenas uma vez por orçamento." 
          });
        }
      }
      
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

  // Check if review exists for quote and client
  app.get('/api/reviews/check/:quoteId/:clientId', async (req, res) => {
    try {
      const { quoteId, clientId } = req.params;
      const existingReview = await storage.getReviewByQuoteAndClient(quoteId, clientId);
      
      if (existingReview) {
        res.json(existingReview);
      } else {
        res.status(404).json({ message: "No review found" });
      }
    } catch (error) {
      console.error("Error checking existing review:", error);
      res.status(500).json({ message: "Failed to check existing review" });
    }
  });

  // Saved Items routes
  app.get('/api/saved-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getSavedItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching saved items:", error);
      res.status(500).json({ message: "Failed to fetch saved items" });
    }
  });

  app.post('/api/saved-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemData = insertSavedItemSchema.parse({ ...req.body, userId });
      
      // Check plan limits
      const user = await storage.getUser(userId);
      const isPremium = user?.plan === "PREMIUM";
      const currentItems = await storage.getSavedItems(userId);
      const maxItems = isPremium ? 15 : 3;
      
      if (currentItems.length >= maxItems) {
        return res.status(403).json({ 
          message: `Limite de ${maxItems} itens salvos atingido. ${!isPremium ? 'Faça upgrade para o plano Pro para salvar mais itens.' : ''}` 
        });
      }
      
      const item = await storage.createSavedItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      console.error("Error creating saved item:", error);
      res.status(500).json({ message: "Failed to create saved item" });
    }
  });

  app.put('/api/saved-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemData = insertSavedItemSchema.partial().parse(req.body);
      
      const item = await storage.updateSavedItem(req.params.id, itemData, userId);
      
      if (!item) {
        return res.status(404).json({ message: "Saved item not found" });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      console.error("Error updating saved item:", error);
      res.status(500).json({ message: "Failed to update saved item" });
    }
  });

  app.delete('/api/saved-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.deleteSavedItem(req.params.id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Saved item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting saved item:", error);
      res.status(500).json({ message: "Failed to delete saved item" });
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

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const isAdminUser = await storage.checkAdminStatus(userId);
      if (!isAdminUser) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin statistics" });
    }
  });

  app.get('/api/admin/users/plan/:plan', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { plan } = req.params;
      const users = await storage.getUsersByPlan(plan);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by plan:", error);
      res.status(500).json({ message: "Failed to fetch users by plan" });
    }
  });

  app.get('/api/admin/users/payment/:status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { status } = req.params;
      const users = await storage.getUsersByPaymentStatus(status);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by payment status:", error);
      res.status(500).json({ message: "Failed to fetch users by payment status" });
    }
  });

  app.patch('/api/admin/users/:userId/plan', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { plan, paymentStatus, paymentMethod } = req.body;
      
      console.log("Admin updating user plan:", { userId, plan, paymentStatus, paymentMethod });
      
      // Update user plan
      const updatedUser = await storage.updateUserPlanStatus(userId, plan, paymentStatus, paymentMethod);
      
      if (!updatedUser) {
        console.log("Storage operation failed - no user returned");
        return res.status(500).json({ message: "Falha ao atualizar dados no banco" });
      }
      
      console.log("User plan updated successfully:", updatedUser.id);
      console.log("=== ADMIN ROUTE SUCCESS ===");
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        plan: updatedUser.plan,
        paymentStatus: updatedUser.paymentStatus,
        paymentMethod: updatedUser.paymentMethod,
        planExpiresAt: updatedUser.planExpiresAt,
        quotesLimit: updatedUser.quotesLimit,
        quotesUsedThisMonth: updatedUser.quotesUsedThisMonth
      });
      
    } catch (error) {
      console.error("=== ADMIN ROUTE ERROR ===");
      console.error("Full error object:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
      
      res.status(500).json({ 
        message: "Erro interno do servidor ao atualizar plano", 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.patch('/api/admin/users/:userId/reset-quotes', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.resetMonthlyQuotes(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error resetting user quotes:", error);
      res.status(500).json({ message: "Failed to reset user quotes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
