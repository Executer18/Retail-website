// src/db.ts
import { drizzle } from 'drizzle-orm/d1';

// 1. Tell TypeScript about your database binding name
export interface Env {
  DB: D1Database; // 👈 Replace 'DB' with your actual wrangler.toml binding name
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY?: string;
}

// 2. A clean helper function to initialize Drizzle safely
export function getDB(env: Env) {
  return drizzle(env.DB);
}
