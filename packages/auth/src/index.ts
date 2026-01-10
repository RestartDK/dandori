import { db } from "@dandori-ai/db";
import * as schema from "@dandori-ai/db/schema/auth";
import { env } from "@dandori-ai/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN ?? ""],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "consent",
      accessType: "offline",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
});
