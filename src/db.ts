import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleSQLite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../auth-schema";
import * as appSchema from "./db/schema";
import { relations as appRelations } from "./db/relations";

// 2. Combine them into one master dictionary
const finalSchema = { 
  ...schema, 
  ...appSchema, 

};

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY?: string;
  IS_LOCAL?: string;
}

export function getDB(env: Env) {
  if (env.IS_LOCAL === "true") {
    return drizzleSQLite(new Database("./dev.db"), { schema: finalSchema });
  }
  return drizzleD1(env.DB, { schema: finalSchema });
}