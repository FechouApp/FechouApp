import { User as DatabaseUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends DatabaseUser {}
  }
}

export {};