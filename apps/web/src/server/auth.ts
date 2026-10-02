import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization, phoneNumber, twoFactor } from "better-auth/plugins";
import { db, schema } from "@hajj/db";
import { sendSms } from "./sms";

export const auth = betterAuth({
  appName: "Hajj Tracking",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: false }),
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    cookiePrefix: "hajj",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/phone-number/send-otp": { window: 60, max: 3 },
      "/phone-number/verify": { window: 60, max: 5 },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      membershipLimit: 500,
    }),
    twoFactor({ issuer: "Hajj Tracking" }),
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      sendOTP: async ({ phoneNumber: to, code }) => {
        await sendSms(to, `Your verification code is ${code}. It expires in 5 minutes.`);
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
