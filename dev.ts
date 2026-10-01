// dev.ts — local dev server for Android/Alpine (no wrangler, no workerd)
import { serve } from "@hono/node-server";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import app from "./src/index";
import { serveStatic } from '@hono/node-server/serve-static'

// your Hono app (default export)
app.use('/*', serveStatic({ root: './public' }))
// ---------- 1. Load .env ----------
const envVars: Record<string, string> = {};
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    envVars[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}

// ---------- 2. Local SQLite file standing in for D1 ----------
const sqlite = new DatabaseSync("./dev.db");
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

// Apply every migration found anywhere under ./drizzle (recursively)
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (f.name.endsWith(".sql")) out.push(p);
  }
  return out;
}
for (const file of walk("./drizzle").sort()) {
  const sql = readFileSync(file, "utf8");
  for (const stmt of sql.split("--> statement-breakpoint")) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    // Add IF NOT EXISTS to CREATE TABLE statements
    const safe = trimmed.replace(
      /CREATE TABLE\s+/gi,
      "CREATE TABLE IF NOT EXISTS "
    );
    try {
      sqlite.exec(safe);
    } catch (e) {
      // skip already-applied statements
    }
  }
  console.log(`applied: ${file}`);
}
// ---------- 3. A D1-shaped shim over node:sqlite ----------
// drizzle-orm/d1 only calls: prepare().bind().all()/first()/run()/raw()
// so we implement exactly that surface.
const toSql = (v: any) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);

const DB: any = {
  prepare(sql: string) {
    const stmt = sqlite.prepare(sql);
    let params: any[] = [];
    return {
      bind(...p: any[]) { params = p.map(toSql); return this; },
      async all() { return { results: stmt.all(...params), success: true }; },
      async first() { return stmt.get(...params) ?? null; },
      async run() {
        const info = stmt.run(...params);
        return { success: true, meta: { changes: info.changes, last_row_id: info.lastRowid } };
      },
      async raw() {
        const cols = stmt.columns().map((c: any) => c.name ?? c.column);
        return stmt.all(...params).map((r: any) => cols.map((c) => r[c]));
      },
    };
  },
  async exec(sql: string) { sqlite.exec(sql); return { success: true }; },
  async batch(stmts: any[]) { return Promise.all(stmts.map((s) => s.all())); },
};

// ---------- 4. Env + serve (port 8787 matches your BETTER_AUTH_URL) ----------
const env = {
  DB,
  IS_LOCAL: "true",
  BETTER_AUTH_SECRET: envVars.BETTER_AUTH_SECRET ?? "dev-secret-change-me-0123456789abcdef",
  BETTER_AUTH_URL: "http://localhost:8787",
  RESEND_API_KEY: envVars.RESEND_API_KEY,
};

serve({ port: 8787, fetch: (req) => app.fetch(req, env, {}) }, (info) => {
  console.log(`\n  dev server running → http://localhost:${info.port}\n`);
});
