import {
  users,
  clients,
  quotes,
  quoteItems,
  reviews,
  payments,
  notifications,
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
  
  // Statistics
  getUserStats(userId: string): Promise<{
    totalQuotes: number;
    approvedQuotes: number;
    totalRevenue: string;
    averageRating: number;
    thisMonthQuotes: number;
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
    const result = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    totalQuotes: number;
    approvedQuotes: number;
    totalRevenue: string;
    averageRating: number;
    thisMonthQuotes: number;
  }> {
    const [quoteStats] = await db
      .select({
        totalQuotes: count(),
        approvedQuotes: count(sql`CASE WHEN status IN ('APPROVED', 'PAID') THEN 1 END`),
        totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN status IN ('APPROVED', 'PAID') THEN total ELSE 0 END), 0)`,
      })
      .from(quotes)
      .where(eq(quotes.userId, userId));

    const [reviewStats] = await db
      .select({
        averageRating: sql<number>`COALESCE(AVG(rating), 0)`,
      })
      .from(reviews)
      .where(eq(reviews.userId, userId));

    const [thisMonthStats] = await db
      .select({
        thisMonthQuotes: count(),
      })
      .from(quotes)
      .where(
        and(
          eq(quotes.userId, userId),
          sql`created_at >= date_trunc('month', current_date)`
        )
      );

    return {
      totalQuotes: quoteStats.totalQuotes,
      approvedQuotes: quoteStats.approvedQuotes,
      totalRevenue: quoteStats.totalRevenue,
      averageRating: reviewStats.averageRating ? Number(Number(reviewStats.averageRating).toFixed(1)) : 0,
      thisMonthQuotes: thisMonthStats.thisMonthQuotes,
    };
  }
}

export const storage = new DatabaseStorage();
