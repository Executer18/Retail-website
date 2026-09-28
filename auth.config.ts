

// auth.config.ts — lives at PROJECT ROOT, next to package.json
import { betterAuth } from "better-auth";

export default betterAuth({
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "customer", input: false },
    },
  },
});
