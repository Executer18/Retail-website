

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";

export function createAuth(env: Env) {
  return betterAuth({
    database: {
      provider: "sqlite",
      adapter: drizzleAdapter(drizzle(env.DB), { provider: "sqlite" }),
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        console.log(`[password reset] for ${user.email}: ${url}`);
        if (env.RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Atta Chakki <onboarding@resend.dev>",
              to: [user.email],
              subject: "Reset your password",
              html: `<p>Hi ${user.name},</p>
                     <p>This link works for 1 hour:</p>
                     <p><a href="${url}">Reset my password</a></p>`,
            }),
          });
        }
      },
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "customer", input: false },
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
  });
}
