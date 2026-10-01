import { createAuth } from "./auth";
import type { Context, Next } from "hono";

export async function requireAdmin(c: Context, next: Next) {
  const session = await createAuth(c.env).api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) return c.redirect("/login")
  if ((session.user as any).role !== "admin") return c.text("Unauthorized", 403)

  c.set("user", session.user)
  await next()
}