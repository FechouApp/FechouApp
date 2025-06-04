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
  updateUserPlanStatus(userId: string, plan: string, paymentStatus: string, paymentMethod?: string): Promise<User | undefined>;
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
  async getQuotes(userId: string): Promise<(Quote & { client: Client; itemCount: number })[]> {
    const user = await this.getUser(userId);
    const isPremium = user?.plan === "PREMIUM";
    const isExpired = user?.planExpiresAt && new Date() > user.planExpiresAt;

    const result = await db
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

    const mappedResult = result.map(row => ({
      ...row.quote,
      client: row.client!,
      itemCount: row.itemCount,
    }));

    // Se não é Premium ou plano expirou, limitar aos 5 orçamentos mais recentes
    if (!isPremium || isExpired) {
      return mappedResult.slice(0, 5);
    }

    return mappedResult;
  }

  async getQuote(id: string, userId: string): Promise<(Quote & { client: Client; items: QuoteItem[] }) | undefined> {
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

    return {
      ...quote.quotes,
      client: quote.clients!,
      items,
    };
  }

  async getQuoteByNumber(quoteNumber: string): Promise<(Quote & { client: Client; items: QuoteItem[] }) | undefined> {
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

    return {
      ...quote.quotes,
      client: quote.clients!,
      items,
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
    const publicUrl = `${quoteNumber.toLowerCase()}`;

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

    if (status === 'VIEWED' && !metadata?.viewedAt) {
      updateData.viewedAt = new Date();
    }
    if (status === 'APPROVED' && !metadata?.approvedAt) {
      updateData.approvedAt = new Date();
    }
    if (status === 'REJECTED') {
      updateData.rejectedAt = new Date();
      if (metadata?.rejectionReason) {
        updateData.rejectionReason = metadata.rejectionReason;
      }
    }

    const result = await db
      .update(quotes)
      .set(updateData)
      .where(eq(quotes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Quote item operations
  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [newItem] = await db
      .insert(quoteItems)
      .values({
        id: nanoid(),
        quoteId: item.quoteId,
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        total: item.total,
        order: item.order || 0,
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
    return await db.select().from(users).orderBy(desc(users.createdAt));
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
        if (existingUser.plan !== "PREMIUM") {
          updateData.quotesUsedThisMonth = 0; // Reset for new premium users
        }
      } else {
        updateData.planExpiresAt = null;
        updateData.quotesLimit = 5;
      }

      console.log("Final update data:", updateData);

      // Execute update
      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      console.log("Database result length:", result.length);
      
      if (result.length === 0) {
        console.log("ERROR: No rows were updated");
        return undefined;
      }
      
      const [updatedUser] = result;
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
    const [user] = await db
      .update(users)
      .set({
        quotesUsedThisMonth: 0,
        lastQuoteReset: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
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
    const [user] = await db
      .update(users)
      .set({
        quotesUsedThisMonth: sql`${users.quotesUsedThisMonth} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }

  async checkAdminStatus(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId));
    
    return user?.isAdmin || false;
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
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // User statistics
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const premiumUsers = allUsers.filter(u => u.plan === 'PREMIUM').length;
    const freeUsers = allUsers.filter(u => u.plan === 'FREE').length;

    // Quote statistics
    const allQuotes = await db.select().from(quotes);
    const totalQuotes = allQuotes.length;
    const activeQuotes = allQuotes.filter(q => q.status === 'draft' || q.status === 'sent').length;
    const approvedQuotes = allQuotes.filter(q => q.status === 'approved').length;
    const pendingQuotes = allQuotes.filter(q => q.status === 'sent').length;
    const rejectedQuotes = allQuotes.filter(q => q.status === 'rejected').length;

    // Revenue calculations (Premium plans at R$ 29,90/month)
    const premiumPrice = 29.90;
    const totalRevenue = (premiumUsers * premiumPrice).toFixed(2).replace('.', ',');
    
    // Monthly revenue (new premium users this month)
    const newPremiumUsersThisMonth = allUsers.filter(u => 
      u.plan === 'PREMIUM' && 
      new Date(u.updatedAt!) >= thirtyDaysAgo
    ).length;
    const monthlyRevenue = (newPremiumUsersThisMonth * premiumPrice).toFixed(2).replace('.', ',');

    // Average quote value (from approved quotes)
    const approvedQuotesWithTotal = allQuotes.filter(q => q.status === 'approved' && q.total);
    const averageQuoteValue = approvedQuotesWithTotal.length > 0 
      ? (approvedQuotesWithTotal.reduce((sum, q) => sum + parseFloat(q.total!.replace(',', '.')), 0) / approvedQuotesWithTotal.length).toFixed(2).replace('.', ',')
      : '0,00';

    // Conversion rate (approved quotes / total quotes)
    const conversionRate = totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0;

    // User growth rate (new users in last 30 days vs previous 30 days)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = allUsers.filter(u => new Date(u.createdAt!) >= thirtyDaysAgo).length;
    const newUsersPrevious30Days = allUsers.filter(u => 
      new Date(u.createdAt!) >= sixtyDaysAgo && new Date(u.createdAt!) < thirtyDaysAgo
    ).length;
    const userGrowthRate = newUsersPrevious30Days > 0 
      ? Math.round(((newUsersLast30Days - newUsersPrevious30Days) / newUsersPrevious30Days) * 100)
      : newUsersLast30Days > 0 ? 100 : 0;

    // Active users (users who created quotes recently)
    const activeUsersToday = allUsers.filter(u => {
      const userQuotes = allQuotes.filter(q => q.userId === u.id);
      return userQuotes.some(q => new Date(q.createdAt!) >= oneDayAgo);
    }).length;

    const activeUsersWeek = allUsers.filter(u => {
      const userQuotes = allQuotes.filter(q => q.userId === u.id);
      return userQuotes.some(q => new Date(q.createdAt!) >= sevenDaysAgo);
    }).length;

    const activeUsersMonth = allUsers.filter(u => {
      const userQuotes = allQuotes.filter(q => q.userId === u.id);
      return userQuotes.some(q => new Date(q.createdAt!) >= thirtyDaysAgo);
    }).length;

    // Retention and churn (simplified calculations)
    const retentionRate = totalUsers > 0 ? Math.round((activeUsersMonth / totalUsers) * 100) : 0;
    const churnRate = Math.max(0, 100 - retentionRate);

    return {
      totalUsers,
      premiumUsers,
      freeUsers,
      totalQuotes,
      activeQuotes,
      approvedQuotes,
      pendingQuotes,
      rejectedQuotes,
      totalRevenue,
      monthlyRevenue,
      averageQuoteValue,
      conversionRate,
      userGrowthRate,
      retentionRate,
      churnRate,
      activeUsersToday,
      activeUsersWeek,
      activeUsersMonth,
    };
  }
}

export const storage = new DatabaseStorage();