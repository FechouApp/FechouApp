import type { Quote, QuoteItem, Client } from "@shared/schema";

export interface QuoteWithDetails extends Quote {
  client: Client;
  items: QuoteItem[];
}

export interface FileUploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
}