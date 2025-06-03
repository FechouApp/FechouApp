export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  cpfCnpj: string | null;
  profession: string | null;
  businessName: string | null;
  logoUrl: string | null;
  customDomain: string | null;
  plan: string;
  planExpiresAt: Date | null;
  pixKey: string | null;
  paymentGatewayId: string | null;
  monthlyQuotes: number;
  quotesLimit: number;
  whatsappNotifications: boolean;
  emailNotifications: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastLoginAt: Date | null;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string;
  cpf: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  quoteCount?: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Quote {
  id: string;
  userId: string;
  clientId: string;
  quoteNumber: string;
  title: string;
  description: string | null;
  observations: string | null;
  paymentTerms: string | null;
  executionDeadline: string | null;
  subtotal: string;
  discount: string;
  total: string;
  status: string;
  validUntil: Date;
  viewedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  sendByWhatsapp: boolean;
  sendByEmail: boolean;
  publicUrl: string | null;
  pdfUrl: string | null;
  contractUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  order: number;
}

export interface QuoteWithDetails extends Quote {
  client: Client;
  items: QuoteItem[];
}

export interface QuoteWithClient extends Quote {
  client: Client;
  itemCount: number;
}

export interface Review {
  id: string;
  userId: string;
  clientId: string;
  quoteId: string | null;
  rating: number;
  comment: string | null;
  isPublic: boolean;
  response: string | null;
  respondedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ReviewWithClient extends Review {
  client: Client;
}

export interface DashboardStats {
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
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  data: any;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date | null;
}

export interface CreateQuoteRequest {
  quote: {
    clientId: string;
    title: string;
    description?: string;
    observations?: string;
    paymentTerms?: string;
    executionDeadline?: string;
    subtotal: string;
    discount: string;
    total: string;
    validUntil: Date;
    sendByWhatsapp: boolean;
    sendByEmail: boolean;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: string;
    total: string;
    order: number;
  }[];
}
