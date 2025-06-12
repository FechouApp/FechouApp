import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  decimal,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: text("profile_image_url"),
  cpfCnpj: varchar("cpf_cnpj").unique(),
  profession: varchar("profession"),
  businessName: varchar("business_name"),
  phone: varchar("phone"),
  address: varchar("address"),
  cep: varchar("cep"),
  numero: varchar("numero"),
  complemento: varchar("complemento"),
  cidade: varchar("cidade"),
  estado: varchar("estado"),
  logoUrl: text("logo_url"),
  customDomain: varchar("custom_domain").unique(),
  plan: varchar("plan").notNull().default("FREE"), // FREE, PREMIUM, PREMIUM_CORTESIA
  planExpiresAt: timestamp("plan_expires_at"),
  pixKey: varchar("pix_key"),
  paymentGatewayId: varchar("payment_gateway_id"),
  monthlyQuotes: integer("monthly_quotes").notNull().default(0),
  quotesLimit: integer("quotes_limit").notNull().default(5),
  bonusQuotes: integer("bonus_quotes").notNull().default(0), // Orçamentos bonus por indicações
  referralCount: integer("referral_count").notNull().default(0), // Contador de indicações
  referralCode: varchar("referral_code").unique(), // Código único de indicação do usuário
  referredBy: varchar("referred_by"), // ID do usuário que indicou este usuário
  whatsappNotifications: boolean("whatsapp_notifications").notNull().default(true),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  primaryColor: varchar("primary_color").default("#3B82F6"), // Cor personalizada Premium
  secondaryColor: varchar("secondary_color").default("#10B981"), // Cor secundária Premium
  // Admin fields
  paymentStatus: varchar("payment_status").default("ativo"), // ativo, pendente, vencido
  paymentMethod: varchar("payment_method"), // pix, manual, asaas
  quotesUsedThisMonth: integer("quotes_used_this_month").default(0),
  lastQuoteReset: timestamp("last_quote_reset").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone").notNull(),
  cpf: varchar("cpf"),
  address: text("address"),
  number: varchar("number"),
  complement: varchar("complement"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quotes table
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id").notNull(),
  quoteNumber: varchar("quote_number").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description"),
  observations: text("observations"),
  paymentTerms: text("payment_terms"),
  executionDeadline: text("execution_deadline"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("draft"), // draft, pending, approved, rejected, paid
  validUntil: date("valid_until").notNull(),
  viewedAt: timestamp("viewed_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  sendByWhatsapp: boolean("send_by_whatsapp").notNull().default(true),
  sendByEmail: boolean("send_by_email").notNull().default(false),
  publicUrl: varchar("public_url").unique(),
  pdfUrl: varchar("pdf_url"),
  contractUrl: varchar("contract_url"),
  photos: text("photos"), // JSON field for storing photo URLs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote items table
export const quoteItems = pgTable("quote_items", {
  id: varchar("id").primaryKey().notNull(),
  quoteId: varchar("quote_id").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  order: integer("order").notNull().default(0),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  clientId: varchar("client_id").notNull(),
  quoteId: varchar("quote_id"),
  rating: integer("rating").notNull(), // 1 to 5
  comment: text("comment"),
  isPublic: boolean("is_public").notNull().default(true),
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  quoteId: varchar("quote_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method").notNull(), // PIX, CREDIT_CARD, BANK_SLIP
  status: varchar("status").notNull().default("PENDING"), // PENDING, PAID, FAILED, REFUNDED
  gatewayId: varchar("gateway_id"),
  gatewayResponse: jsonb("gateway_response"),
  pixCode: varchar("pix_code"),
  pixQrCode: varchar("pix_qr_code"),
  pixExpiresAt: timestamp("pix_expires_at"),
  cardLast4: varchar("card_last4"),
  cardBrand: varchar("card_brand"),
  installments: integer("installments"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // QUOTE_VIEWED, QUOTE_APPROVED, etc.
  data: jsonb("data"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved Items table
export const savedItems = pgTable("saved_items", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quote Attachments table (Premium feature)
export const quoteAttachments = pgTable("quote_attachments", {
  id: varchar("id").primaryKey().notNull(),
  quoteId: varchar("quote_id").notNull(),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  filePath: varchar("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  quotes: many(quotes),
  reviews: many(reviews),
  payments: many(payments),
  notifications: many(notifications),
  savedItems: many(savedItems),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  quotes: many(quotes),
  reviews: many(reviews),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  user: one(users, { fields: [quotes.userId], references: [users.id] }),
  client: one(clients, { fields: [quotes.clientId], references: [clients.id] }),
  items: many(quoteItems),
  payments: many(payments),
  attachments: many(quoteAttachments),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, { fields: [quoteItems.quoteId], references: [quotes.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  client: one(clients, { fields: [reviews.clientId], references: [clients.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  quote: one(quotes, { fields: [payments.quoteId], references: [quotes.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const savedItemsRelations = relations(savedItems, ({ one }) => ({
  user: one(users, { fields: [savedItems.userId], references: [users.id] }),
}));

export const quoteAttachmentsRelations = relations(quoteAttachments, ({ one }) => ({
  quote: one(quotes, { fields: [quoteAttachments.quoteId], references: [quotes.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteNumber: true,
  publicUrl: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});

export const insertQuoteItemWithoutQuoteIdSchema = createInsertSchema(quoteItems).omit({
  id: true,
  quoteId: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSavedItemSchema = createInsertSchema(savedItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteAttachmentSchema = createInsertSchema(quoteAttachments).omit({
  id: true,
  createdAt: true,
});

// Referrals table - Sistema de indicações
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().notNull(),
  referrerId: varchar("referrer_id").notNull(), // Quem indicou
  referredId: varchar("referred_id").notNull(), // Quem foi indicado
  referralCode: varchar("referral_code").notNull(), // Código usado na indicação
  status: varchar("status").notNull().default("pending"), // pending, completed, rewarded
  rewardType: varchar("reward_type"), // bonus_quote, premium_extension
  rewardValue: integer("reward_value"), // quantidade do bônus
  completedAt: timestamp("completed_at"), // quando o indicado se cadastrou
  rewardedAt: timestamp("rewarded_at"), // quando o bônus foi dado
  createdAt: timestamp("created_at").defaultNow(),
});

// User Activity Log - Log de ações do usuário
export const userActivityLog = pgTable("user_activity_log", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(), // login, create_quote, send_quote, upgrade_plan, etc.
  category: varchar("category").notNull(), // authentication, quote, payment, referral, etc.
  details: jsonb("details"), // dados adicionais da ação
  metadata: jsonb("metadata"), // browser, IP, device info
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;
export type SavedItem = typeof savedItems.$inferSelect;

export type InsertQuoteAttachment = z.infer<typeof insertQuoteAttachmentSchema>;
export type QuoteAttachment = typeof quoteAttachments.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;