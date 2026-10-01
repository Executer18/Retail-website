import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleSQLite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../auth-schema";

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY?: string;
  IS_LOCAL?: string;
}

export function getDB(env: Env) {
  if (env.IS_LOCAL === "true") {
    return drizzleSQLite(new Database("./dev.db"), { schema });
  }
  return drizzleD1(env.DB, { schema });
}