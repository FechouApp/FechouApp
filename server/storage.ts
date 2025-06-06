import {
  users,
  clients,
  quotes,
  quoteItems,
  reviews,
  payments,
  notifications,
  savedItems, // ADDED
  type User,
  type UpsertUser,
  type InsertClient,
  type Client,
  type InsertQuote,
  type Quote,
  type InsertQuoteItem,
  type QuoteItem,
  type InsertReview,
  type Review,
  type InsertPayment,
  type Payment,
  type InsertNotification,
  type Notification,
  type InsertSavedItem, // ADDED
  type SavedItem, // ADDED
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql, and, or, like, asc, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPlan(id: string, plan: string, planExpiresAt: Date | null): Promise<User>;
  addReferralBonus(userId: string): Promise<User>;
  updateUserColors(id: string, primaryColor: string, secondaryColor: string): Promise<User>;

  // Client operations
  getClients(userId: string): Promise<Client[]>;
  getClient(id: string, userId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>, userId: string): Promise<Client | undefined>;
  deleteClient(id: string, userId: string): Promise<boolean>;
  searchClients(userId: string, searchTerm: string): Promise<Client[]>;

  // Quote operations
  getQuotes(userId: string): Promise<(Quote & { client: Client; itemCount: number })[]>;
  getQuote(id: string, userId: string): Promise<(Quote & { client: Client; items: QuoteItem[] }) | undefined>;
  getQuoteByNumber(quoteNumber: string): Promise<(Quote & { client: Client; items: QuoteItem[] }) | undefined>;
  getQuoteById(id: string): Promise<Quote | undefined>;
  getQuotesInDateRange(userId: string, startDate: Date, endDate: Date): Promise<Quote[]>;
  createQuote(quote: InsertQuote, items: InsertQuoteItem[]): Promise<Quote>;
  updateQuote(id: string, quote: Partial<InsertQuote>, userId: string): Promise<Quote | undefined>;
  deleteQuote(id: string, userId: string): Promise<boolean>;
  updateQuoteStatus(id: string, status: string, metadata?: any): Promise<boolean>;

  // Quote item operations
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  updateQuoteItem(id: string, item: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined>;
  deleteQuoteItem(id: string): Promise<boolean>;

  // Review operations
  getReviews(userId: string): Promise<(Review & { client: Client })[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, review: Partial<InsertReview>): Promise<Review | undefined>;

  // Payment operations
  getPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;

  // Notification operations
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string, userId: string): Promise<boolean>;

  // Saved Items operations  // ADDED
  getSavedItems(userId: string): Promise<SavedItem[]>;  // ADDED
  createSavedItem(savedItem: InsertSavedItem): Promise<SavedItem>;  // ADDED
  updateSavedItem(id: string, savedItem: Partial<InsertSavedItem>, userId: string): Promise<SavedItem | undefined>;  // ADDED
  deleteSavedItem(id: string, userId: string): Promise<boolean>; // ADDED

  // Statistics
  getUserStats(userId: string): Promise<{
    totalQuotes: number;
    approvedQuotes: number;
    totalRevenue: string;
    averageRating: number;
    thisMonthQuotes: number;
  }>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserPlanStatus(userId: string, plan: string, paymentStatus: string, paymentMethod?: string | null): Promise<User | undefined>;
  resetMonthlyQuotes(userId: string): Promise<User | undefined>;
  getUsersByPlan(plan: string): Promise<User[]>;
  getUsersByPaymentStatus(status: string): Promise<User[]>;
  incrementQuoteUsage(userId: string): Promise<User | undefined>;
  checkAdminStatus(userId: string): Promise<boolean>;
  getAdminStats(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    freeUsers: number;
    totalQuotes: number;
    activeQuotes: number;
    approvedQuotes: number;
    pendingQuotes: number;
    rejectedQuotes: number;
    totalRevenue: string;
    monthlyRevenue: string;
    averageQuoteValue: string;
    conversionRate: number;
    userGrowthRate: number;
    retentionRate: number;
    churnRate: number;
    activeUsersToday: number;
    activeUsersWeek: number;
    activeUsersMonth: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPlan(id: string, plan: string, planExpiresAt: Date | null): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        plan, 
        planExpiresAt,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async addReferralBonus(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const [updatedUser] = await db
      .update(users)
      .set({ 
        referralCount: user.referralCount + 1,
        bonusQuotes: user.bonusQuotes + 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async updateUserColors(id: string, primaryColor: string, secondaryColor: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        primaryColor,
        secondaryColor,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Client operations
  async getClients(userId: string): Promise<Client[]> {
    const clientsList = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, userId))
      .orderBy(desc(clients.createdAt));

    // Get quote count for each client
    const clientsWithQuoteCount = await Promise.all(
      clientsList.map(async (client) => {
        const quoteCountResult = await db
          .select({ count: count(quotes.id) })
          .from(quotes)
          .where(eq(quotes.clientId, client.id));

        return {
          ...client,
          quoteCount: quoteCountResult[0]?.count || 0,
        };
      })
    );

    return clientsWithQuoteCount as any;
  }

  async getClient(id: string, userId: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values({ ...client, id: nanoid() })
      .returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>, userId: string): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.userId, userId)))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async searchClients(userId: string, searchTerm: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.userId, userId),
          or(
            like(clients.name, `%${searchTerm}%`),
            like(clients.email, `%${searchTerm}%`),
            like(clients.phone, `%${searchTerm}%`)
          )
        )
      )
      .orderBy(desc(clients.createdAt));
  }

  // Quote operations
  async getQuotes(userId: string): Promise<(Quote & { client: Client; itemCount: number; photos?: any[] })[]> {
    const user = await this.getUser(userId);
    const isPremium = user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA";
    const isExpired = user?.planExpiresAt && new Date() > user.planExpiresAt;

    console.log(`Getting quotes for user ${userId}:`, {
      plan: user?.plan,
      isPremium,
      isExpired,
      planExpiresAt: user?.planExpiresAt
    });

    const baseQuery = db
      .select({
        quote: quotes,
        client: clients,
        itemCount: count(quoteItems.id),
      })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .leftJoin(quoteItems, eq(quotes.id, quoteItems.quoteId))
      .where(eq(quotes.userId, userId))
      .groupBy(quotes.id, clients.id)
      .orderBy(desc(quotes.createdAt));

    // Aplicar limitação para planos gratuitos
    let result;
    if (!isPremium || isExpired) {
      console.log("Applying free plan limitation - showing only last 5 quotes");
      result = await baseQuery.limit(5);
    } else {
      console.log(`${user?.plan} plan detected - unlimited quotes`);
      result = await baseQuery;
    }

    const mappedResult = result.map(row => {
      // Parse photos from JSON field
      let photos = [];
      try {
        if (row.quote.photos) {
          photos = typeof row.quote.photos === 'string' 
            ? JSON.parse(row.quote.photos) 
            : row.quote.photos;
        }
      } catch (error) {
        console.error('Error parsing photos:', error);
        photos = [];
      }

      return {
        ...row.quote,
        client: row.client!,
        itemCount: row.itemCount,
        photos,
      };
    });

    // Para PREMIUM_CORTESIA, nunca limitar
    if (user?.plan === "PREMIUM_CORTESIA") {
      console.log("PREMIUM_CORTESIA plan detected - unlimited quotes");
      return mappedResult;
    }

    // Para PREMIUM, verificar expiração
    if (isPremium && !isExpired) {
      console.log("Valid premium plan - unlimited quotes");
      return mappedResult;
    }

    // Se não é Premium ou plano expirou, limitar aos 5 orçamentos mais recentes
    console.log("Free plan or expired - limiting to 5 quotes");
    return mappedResult.slice(0, 5);
  }

  async getQuote(id: string, userId: string): Promise<(Quote & { client: Client; items: QuoteItem[]; photos?: any[] }) | undefined> {
    const [quote] = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(and(eq(quotes.id, id), eq(quotes.userId, userId)));

    if (!quote) return undefined;

    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id))
      .orderBy(asc(quoteItems.order));

    console.log('Raw quote photos from DB:', quote.quotes.photos);

    // Parse photos from JSON field
    let photos = [];
    try {
      if (quote.quotes.photos) {
        photos = typeof quote.quotes.photos === 'string' 
          ? JSON.parse(quote.quotes.photos) 
          : quote.quotes.photos;
        console.log('Parsed photos:', photos);
      }
    } catch (error) {
      console.error('Error parsing photos:', error);
      photos = [];
    }

    return {
      ...quote.quotes,
      client: quote.clients!,
      items,
      photos,
    };
  }

  async getQuoteByNumber(quoteNumber: string): Promise<(Quote & { client: Client; items: QuoteItem[]; photos?: any[] }) | undefined> {
    const [quote] = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.quoteNumber, quoteNumber));

    if (!quote) return undefined;

    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quote.quotes.id))
      .orderBy(asc(quoteItems.order));

    console.log('Public quote photos from DB:', quote.quotes.photos);

    // Parse photos from JSON field
    let photos = [];
    try {
      if (quote.quotes.photos) {
        photos = typeof quote.quotes.photos === 'string' 
          ? JSON.parse(quote.quotes.photos) 
          : quote.quotes.photos;
        console.log('Public parsed photos:', photos);
      }
    } catch (error) {
      console.error('Error parsing photos:', error);
      photos = [];
    }

    return {
      ...quote.quotes,
      client: quote.clients!,
      items,
      photos,
    };
  }

  async getQuotesInDateRange(userId: string, startDate: Date, endDate: Date): Promise<Quote[]> {
    const result = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.userId, userId),
          gte(quotes.createdAt, startDate),
          lte(quotes.createdAt, endDate)
        )
      );

    return result;
  }

  async createQuote(quote: InsertQuote, items: InsertQuoteItem[]): Promise<Quote> {
    const quoteId = nanoid();
    const quoteNumber = `FH${Date.now().toString().slice(-6)}`;
    const publicUrl = quoteNumber;

    const [newQuote] = await db
      .insert(quotes)
      .values({
        ...quote,
        id: quoteId,
        quoteNumber,
        publicUrl,
      })
      .returning();

    // Insert quote items
    if (items.length > 0) {
      await db.insert(quoteItems).values(
        items.map((item, index) => ({
          ...item,
          id: nanoid(),
          quoteId,
          order: index,
        }))
      );
    }

    return newQuote;
  }

  async updateQuote(id: string, quote: Partial<InsertQuote>, userId: string): Promise<Quote | undefined> {
    const [updatedQuote] = await db
      .update(quotes)
      .set({ ...quote, updatedAt: new Date() })
      .where(and(eq(quotes.id, id), eq(quotes.userId, userId)))
      .returning();
    return updatedQuote;
  }

  async deleteQuote(id: string, userId: string): Promise<boolean> {
    // Delete quote items first
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));

    // Delete quote
    const result = await db
      .delete(quotes)
      .where(and(eq(quotes.id, id), eq(quotes.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async updateQuoteStatus(id: string, status: string, metadata?: any): Promise<boolean> {
    const updateData: any = { status, updatedAt: new Date() };

    if (metadata?.viewedAt) {
      updateData.viewedAt = metadata.viewedAt;
    }
    if (metadata?.approvedAt) {
      updateData.approvedAt = metadata.approvedAt;
    }
    if (metadata?.rejectedAt) {
      updateData.rejectedAt = metadata.rejectedAt;
    }
    if (metadata?.rejectionReason) {
      updateData.rejectionReason = metadata.rejectionReason;
    }
    if (metadata?.sentViaWhatsApp) {
      updateData.sentViaWhatsApp = metadata.sentViaWhatsApp;
    }
    if (metadata?.sentAt) {
      updateData.sentAt = metadata.sentAt;
    }

    const result = await db
      .update(quotes)
      .set(updateData)
      .where(eq(quotes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getQuoteById(id: string): Promise<Quote | undefined> {
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id));
    return quote;
  }

  async getQuotesByClientId(clientId: string, userId: string): Promise<Quote[]> {
    const clientQuotes = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.clientId, clientId), eq(quotes.userId, userId)))
      .orderBy(desc(quotes.createdAt));
    return clientQuotes;
  }

  // Quote item operations
  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [newItem] = await db
      .insert(quoteItems)
      .values({
        id: nanoid(),
        ...item
      })
      .returning();
    return newItem;
  }

  async updateQuoteItem(id: string, item: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined> {
    const [updatedItem] = await db
      .update(quoteItems)
      .set(item)
      .where(eq(quoteItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteQuoteItem(id: string): Promise<boolean> {
    const result = await db.delete(quoteItems).where(eq(quoteItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteQuoteItems(quoteId: string): Promise<boolean> {
    const result = await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
    return true; // Sempre retorna true mesmo se não há itens para deletar
  }

  async createQuoteItems(items: InsertQuoteItem[]): Promise<QuoteItem[]> {
    if (items.length === 0) return [];

    const newItems = await db
      .insert(quoteItems)
      .values(
        items.map(item => ({
          id: nanoid(),
          quoteId: item.quoteId,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          total: item.total,
          order: item.order || 0,
        }))
      )
      .returning();
    return newItems;
  }

  // Review operations
  async getReviews(userId: string): Promise<(Review & { client: Client })[]> {
    const result = await db
      .select()
      .from(reviews)
      .leftJoin(clients, eq(reviews.clientId, clients.id))
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));

    return result.map(row => ({
      ...row.reviews,
      client: row.clients!,
    }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values({ ...review, id: nanoid() })
      .returning();
    return newReview;
  }

  async updateReview(id: string, review: Partial<InsertReview>): Promise<Review | undefined> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return updatedReview;
  }

  async getReviewByQuoteAndClient(quoteId: string, clientId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.quoteId, quoteId), eq(reviews.clientId, clientId)));
    return review;
  }

  // Payment operations
  async getPayments(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values({ ...payment, id: nanoid() })
      .returning();
    return newPayment;
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updatedPayment] = await db
      .update(payments)
      .set({ ...payment, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  // Notification operations
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values({ ...notification, id: nanoid() })
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return !!notification;
  }

  // Saved Items operations
  async getSavedItems(userId: string): Promise<SavedItem[]> {
    return await db
      .select()
      .from(savedItems)
      .where(eq(savedItems.userId, userId))
      .orderBy(asc(savedItems.name));
  }

  async createSavedItem(savedItem: InsertSavedItem): Promise<SavedItem> {
    const [newSavedItem] = await db
      .insert(savedItems)
      .values({ ...savedItem, id: nanoid() })
      .returning();
    return newSavedItem;
  }

  async updateSavedItem(id: string, savedItem: Partial<InsertSavedItem>, userId: string): Promise<SavedItem | undefined> {
    const [updatedSavedItem] = await db
      .update(savedItems)
      .set({ ...savedItem, updatedAt: new Date() })
      .where(and(eq(savedItems.id, id), eq(savedItems.userId, userId)))
      .returning();
    return updatedSavedItem;
  }

  async deleteSavedItem(id: string, userId: string): Promise<boolean> {
    const [deletedSavedItem] = await db
      .delete(savedItems)
      .where(and(eq(savedItems.id, id), eq(savedItems.userId, userId)))
      .returning();
    return !!deletedSavedItem;
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    totalQuotes: number;
    approvedQuotes: number;
    totalRevenue: string;
    averageRating: number;
    thisMonthQuotes: number;
    quoteTrend?: string;
    quoteTrendUp?: boolean;
    approvalTrend?: string;
    approvalTrendUp?: boolean;
    revenueTrend?: string;
    revenueTrendUp?: boolean;
    ratingTrend?: string;
    ratingTrendUp?: boolean;
  }> {
    console.log("Getting user stats for:", userId);

    // Get current date boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Check if we need to reset monthly quotes
    await this.checkAndResetMonthlyQuotes(userId);

    // Get all quotes for the user
    const userQuotes = await db
      .select()
      .from(quotes)
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt));

    // Filter quotes by month
    const thisMonthQuotes = userQuotes.filter(quote => 
      quote.createdAt && new Date(quote.createdAt) >= startOfMonth
    );

    const lastMonthQuotes = userQuotes.filter(quote => {
      if (!quote.createdAt) return false;
      const quoteDate = new Date(quote.createdAt);
      return quoteDate >= startOfLastMonth && quoteDate <= endOfLastMonth;
    });

    // Update user's monthly quote count in database
    await db
      .update(users)
      .set({ 
        quotesUsedThisMonth: thisMonthQuotes.length,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Count quotes by status
    const totalQuotes = userQuotes.length;
    const approvedQuotes = userQuotes.filter(q => q.status === 'approved' || q.status === 'paid').length;
    const pendingQuotes = userQuotes.filter(q => q.status === 'pending').length;
    const draftQuotes = userQuotes.filter(q => q.status === 'draft').length;

    const [quoteStats] = await db
      .select({
        totalQuotes: count(),
        approvedQuotes: count(sql`CASE WHEN status IN ('approved', 'paid') THEN 1 END`),
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN total ELSE 0 END), 0)`,
      })
      .from(quotes)
      .where(eq(quotes.userId, userId));

    const [reviewStats] = await db
      .select({
        averageRating: sql<number>`COALESCE(AVG(rating), 0)`,
      })
      .from(reviews)
      .where(eq(reviews.userId, userId));

    // Stats do mês atual
    const [thisMonthStats] = await db
      .select({
        thisMonthQuotes: count(),
        thisMonthApproved: count(sql`CASE WHEN status IN ('approved', 'paid') THEN 1 END`),
        thisMonthRevenue: sql<string>`COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN total ELSE 0 END), 0)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.userId, userId),
          sql`created_at >= date_trunc('month', current_date)`
        )
      );

    // Stats do mês anterior
    const [lastMonthStats] = await db
      .select({
        lastMonthQuotes: count(),
        lastMonthApproved: count(sql`CASE WHEN status IN ('approved', 'paid') THEN 1 END`),
        lastMonthRevenue: sql<string>`COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN total ELSE 0 END), 0)`,
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.userId, userId),
          sql`created_at >= date_trunc('month', current_date) - interval '1 month'`,
          sql`created_at < date_trunc('month', current_date)`
        )
      );

    // Avaliações do mês atual
    const [thisMonthRating] = await db
      .select({
        thisMonthRating: sql<number>`COALESCE(AVG(rating), 0)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          sql`created_at >= date_trunc('month', current_date)`
        )
      );

    // Avaliações do mês anterior
    const [lastMonthRating] = await db
      .select({
        lastMonthRating: sql<number>`COALESCE(AVG(rating), 0)`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          sql`created_at >= date_trunc('month', current_date) - interval '1 month'`,
          sql`created_at < date_trunc('month', current_date)`
        )
      );

    // Calcular trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? { trend: "+100%", up: true } : { trend: "", up: false };
      const percentage = ((current - previous) / previous * 100);
      const sign = percentage >= 0 ? "+" : "";
      return {
        trend: `${sign}${percentage.toFixed(0)}%`,
        up: percentage >= 0
      };
    };

    const quoteTrendData = calculateTrend(thisMonthStats.thisMonthQuotes, lastMonthStats.lastMonthQuotes);
    const approvalTrendData = calculateTrend(thisMonthStats.thisMonthApproved, lastMonthStats.lastMonthApproved);
    const revenueTrendData = calculateTrend(
      parseFloat(thisMonthStats.thisMonthRevenue),
      parseFloat(lastMonthStats.lastMonthRevenue)
    );
    const ratingTrendData = calculateTrend(
      Number(thisMonthRating.thisMonthRating),
      Number(lastMonthRating.lastMonthRating)
    );

    return {
      totalQuotes: quoteStats.totalQuotes,
      approvedQuotes: quoteStats.approvedQuotes,
      totalRevenue: quoteStats.totalRevenue,
      averageRating: reviewStats.averageRating ? Number(Number(reviewStats.averageRating).toFixed(1)) : 0,
      thisMonthQuotes: thisMonthStats.thisMonthQuotes,
      quoteTrend: quoteTrendData.trend,
      quoteTrendUp: quoteTrendData.up,
      approvalTrend: approvalTrendData.trend,
      approvalTrendUp: approvalTrendData.up,
      revenueTrend: revenueTrendData.trend,
      revenueTrendUp: revenueTrendData.up,
      ratingTrend: ratingTrendData.trend,
      ratingTrendUp: ratingTrendData.up,
    };
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    console.log("=== Getting all users for admin ===");

    // Get all users first
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Calculate current month quotes for each user
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const usersWithQuoteCounts = await Promise.all(
      allUsers.map(async (user) => {
        // Count quotes for current month
        const [monthlyQuotesResult] = await db
          .select({ count: count() })
          .from(quotes)
          .where(
            and(
              eq(quotes.userId, user.id),
              gte(quotes.createdAt, startOfMonth),
              lte(quotes.createdAt, endOfMonth)
            )
          );

        const monthlyQuotesCount = monthlyQuotesResult?.count || 0;

        return {
          ...user,
          quotesUsedThisMonth: monthlyQuotesCount,
          monthlyQuotes: monthlyQuotesCount,
        };
      })
    );

    return usersWithQuoteCounts;
  }

  async updateUserPlanStatus(userId: string, plan: string, paymentStatus: string, paymentMethod?: string | null): Promise<User | undefined> {
    console.log("=== STORAGE updateUserPlanStatus START ===");
    console.log("Parameters:", { userId, plan, paymentStatus, paymentMethod });

    try {
      // Verify user exists first
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        console.log("ERROR: User not found in database:", userId);
        return undefined;
      }
      console.log("User found:", existingUser.email);

      // Prepare update object
      const updateData: any = {
        plan: plan.toUpperCase(),
        paymentStatus: paymentStatus.toLowerCase(),
        paymentMethod: paymentMethod || null,
        updatedAt: new Date(),
      };

      // Set plan-specific fields
      if (plan.toUpperCase() === "PREMIUM") {
        updateData.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        updateData.quotesLimit = 999999;
        if (existingUser.plan !== "PREMIUM" && existingUser.plan !== "PREMIUM_CORTESIA") {
          updateData.quotesUsedThisMonth = 0; // Reset for new premium users
        }
      } else if (plan.toUpperCase() === "PREMIUM_CORTESIA") {
        updateData.planExpiresAt = null; // Courtesy plans never expire
        updateData.quotesLimit = 999999;
        if (existingUser.plan !== "PREMIUM" && existingUser.plan !== "PREMIUM_CORTESIA") {
          updateData.quotesUsedThisMonth = 0; // Reset for new premium users
        }
      } else {
        updateData.planExpiresAt = null;
        updateData.quotesLimit = 5;
      }

      console.log("Final update data:", updateData);

      // Execute update
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      console.log("Database result:", updatedUser);

      if (!updatedUser) {
        console.log("ERROR: No rows were updated");
        return undefined;
      }

      console.log("SUCCESS: User updated:", {
        id: updatedUser.id,
        plan: updatedUser.plan,
        paymentStatus: updatedUser.paymentStatus,
        paymentMethod: updatedUser.paymentMethod
      });
      console.log("=== STORAGE updateUserPlanStatus SUCCESS ===");

      return updatedUser;

    } catch (error) {
      console.error("=== STORAGE updateUserPlanStatus ERROR ===");
      console.error("Database error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "No stack trace",
        name: error instanceof Error ? error.name : "Unknown error type"
      });

      // Re-throw with more context
      throw new Error(`Database update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async resetMonthlyQuotes(userId: string): Promise<User | undefined> {
    try {
      console.log("Resetting monthly quotes for user:", userId);

      const [updatedUser] = await db
        .update(users)
        .set({ 
          quotesUsedThisMonth: 0,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      console.log("Monthly quotes reset result:", updatedUser);
      return updatedUser;
    } catch (error) {
      console.error("Error in resetMonthlyQuotes:", error);
      throw error;
    }
  }

  async getUsersByPlan(plan: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.plan, plan))
      .orderBy(desc(users.createdAt));
  }

  async getUsersByPaymentStatus(status: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.paymentStatus, status))
      .orderBy(desc(users.createdAt));
  }

  async incrementQuoteUsage(userId: string): Promise<User | undefined> {
    // Check if we need to reset monthly quotes before incrementing
    await this.checkAndResetMonthlyQuotes(userId);

    const user = await this.getUser(userId);
    if (!user) return undefined;

    const [updatedUser] = await db
      .update(users)
      .set({ 
        quotesUsedThisMonth: (user.quotesUsedThisMonth || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Método privado para verificar e resetar orçamentos mensais automaticamente
  private async checkAndResetMonthlyQuotes(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const now = new Date();
    const lastReset = user.lastQuoteReset ? new Date(user.lastQuoteReset) : new Date(0);
    
    // Se o último reset foi em um mês diferente do atual
    const shouldReset = lastReset.getFullYear() !== now.getFullYear() || 
                       lastReset.getMonth() !== now.getMonth();

    if (shouldReset) {
      console.log(`Auto-resetting monthly quotes for user ${userId}`);
      
      await db
        .update(users)
        .set({ 
          quotesUsedThisMonth: 0,
          lastQuoteReset: now,
          updatedAt: now
        })
        .where(eq(users.id, userId));
      
      console.log(`Monthly quotes reset completed for user ${userId}`);
    }
  }

  async checkAdminStatus(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.isAdmin === true;
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    premiumUsers: number;
    freeUsers: number;
    totalQuotes: number;
    activeQuotes: number;
    approvedQuotes: number;
    pendingQuotes: number;
    rejectedQuotes: number;
    totalRevenue: string;
    monthlyRevenue: string;
    averageQuoteValue: string;
    conversionRate: number;
    userGrowthRate: number;
    retentionRate: number;
    churnRate: number;
    activeUsersToday: number;
    activeUsersWeek: number;
    activeUsersMonth: number;
  }> {
    // Get user stats
    const [userStats] = await db
      .select({
        totalUsers: count(),
        premiumUsers: count(sql`CASE WHEN plan IN ('PREMIUM', 'PREMIUM_CORTESIA') THEN 1 END`),
        freeUsers: count(sql`CASE WHEN plan = 'FREE' THEN 1 END`),
      })
      .from(users);

    // Get quote stats
    const [quoteStats] = await db
      .select({
        totalQuotes: count(),
        activeQuotes: count(sql`CASE WHEN status = 'pending' THEN 1 END`),
        approvedQuotes: count(sql`CASE WHEN status IN ('approved', 'paid') THEN 1 END`),
        pendingQuotes: count(sql`CASE WHEN status = 'pending' THEN 1 END`),
        rejectedQuotes: count(sql`CASE WHEN status = 'rejected' THEN 1 END`),
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN total ELSE 0 END), 0)`,
      })
      .from(quotes);

    // Get monthly revenue
    const [monthlyStats] = await db
      .select({
        monthlyRevenue: sql<string>`COALESCE(SUM(CASE WHEN status IN ('approved', 'paid') THEN total ELSE 0 END), 0)`,
      })
      .from(quotes)
      .where(sql`created_at >= date_trunc('month', current_date)`);

    // Calculate averages and rates
    const totalRevenue = parseFloat(quoteStats.totalRevenue);
    const averageQuoteValue = quoteStats.approvedQuotes > 0 
      ? (totalRevenue / quoteStats.approvedQuotes).toFixed(2)
      : "0";

    const conversionRate = quoteStats.totalQuotes > 0 
      ? (quoteStats.approvedQuotes / quoteStats.totalQuotes) * 100
      : 0;

    return {
      totalUsers: userStats.totalUsers,
      premiumUsers: userStats.premiumUsers,
      freeUsers: userStats.freeUsers,
      totalQuotes: quoteStats.totalQuotes,
      activeQuotes: quoteStats.activeQuotes,
      approvedQuotes: quoteStats.approvedQuotes,
      pendingQuotes: quoteStats.pendingQuotes,
      rejectedQuotes: quoteStats.rejectedQuotes,
      totalRevenue: quoteStats.totalRevenue,
      monthlyRevenue: monthlyStats.monthlyRevenue,
      averageQuoteValue,
      conversionRate: Number(conversionRate.toFixed(1)),
      userGrowthRate: 0, // Would need historical data to calculate
      retentionRate: 0, // Would need historical data to calculate
      churnRate: 0, // Would need historical data to calculate
      activeUsersToday: 0, // Would need login tracking to calculate
      activeUsersWeek: 0, // Would need login tracking to calculate
      activeUsersMonth: 0, // Would need login tracking to calculate
    };
  }
}

export const storage = new DatabaseStorage();