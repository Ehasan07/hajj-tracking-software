import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP, organization, phoneNumber, twoFactor } from "better-auth/plugins";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@hajj/db";
import {
  allowPasswordReset,
  clearFailures,
  deviceCheckEnabled,
  deviceMeta,
  isLocked,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  PENDING_COOKIE,
  pendingCookieOptions,
  recordFailure,
  sendResetCode,
  sendSecurityAlert,
  sign,
  startDeviceChallenge,
  TRUST_COOKIE,
  trustCookieOptions,
  trustDevice,
  trustedDeviceFor,
  unsign,
} from "./device-otp";
import { clientIp } from "./client-ip";
import { sendSms } from "./sms";

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

const hookIp = (ctx: HookContext) => clientIp(ctx.headers) ?? "unknown";

const cookieAttrs = (o: typeof trustCookieOptions) => ({ httpOnly: o.httpOnly, secure: o.secure, sameSite: o.sameSite, path: o.path, maxAge: o.maxAge });

/** Before sign-in: refuse a locked email/address pair. Before a reset code: enforce the wait and daily limit. */
const beforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/sign-in/email") {
    const email = String((ctx.body as { email?: string } | undefined)?.email ?? "");
    if (isLocked(hookIp(ctx), email)) throw new APIError("TOO_MANY_REQUESTS", { message: "LOCKED" });
  }
  if (ctx.path === "/email-otp/request-password-reset") {
    const email = String((ctx.body as { email?: string } | undefined)?.email ?? "");
    // Same answer whether or not anything is sent, so the form can't be used to find accounts.
    if (email && !(await allowPasswordReset(email))) return ctx.json({ success: true });
  }
});

/**
 * After sign-in: a browser that isn't trusted yet doesn't get the session.
 * The session just made is deleted, a code goes to the account's email, and
 * the sign-in form asks for it. After a password reset, the browser that did
 * it is trusted (it just proved it reads that inbox) and the owner is told.
 * The browser an account is opened in is trusted from the start.
 */
const afterHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/sign-in/email") {
    const email = String((ctx.body as { email?: string } | undefined)?.email ?? "");
    const ip = hookIp(ctx);
    const returned = ctx.context.returned;
    if (returned instanceof APIError) {
      if (returned.status === "UNAUTHORIZED") recordFailure(ip, email);
      return;
    }
    clearFailures(ip, email);
    const created = ctx.context.newSession;
    if (!created || !deviceCheckEnabled()) return;
    const meta = deviceMeta(ctx.headers ?? new Headers());
    if (await trustedDeviceFor(created.user.id, ctx.getCookie(TRUST_COOKIE), meta)) return;

    await ctx.context.internalAdapter.deleteSession(created.session.token);
    ctx.context.responseHeaders?.delete("set-cookie");
    const challenge = await startDeviceChallenge(created.user.id, created.user.email, meta, unsign(ctx.getCookie(PENDING_COOKIE)));
    ctx.setCookie(PENDING_COOKIE, sign(challenge.id), cookieAttrs(pendingCookieOptions));
    return ctx.json({ deviceVerification: true, email: challenge.email, device: challenge.device, resendIn: challenge.resendIn });
  }

  if (ctx.path === "/email-otp/reset-password" && !(ctx.context.returned instanceof APIError)) {
    const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").toLowerCase();
    const found = await ctx.context.internalAdapter.findUserByEmail(email);
    if (!found) return;
    const meta = deviceMeta(ctx.headers ?? new Headers());
    if (deviceCheckEnabled()) {
      ctx.setCookie(TRUST_COOKIE, await trustDevice(found.user.id, meta, ctx.getCookie(TRUST_COOKIE)), cookieAttrs(trustCookieOptions));
    }
    void sendSecurityAlert(found.user.id, "password", meta);
  }

  // The browser an account was opened in is that account's first trusted device.
  if (ctx.path === "/sign-up/email" && ctx.context.newSession && deviceCheckEnabled()) {
    const meta = deviceMeta(ctx.headers ?? new Headers());
    const value = await trustDevice(ctx.context.newSession.user.id, meta, ctx.getCookie(TRUST_COOKIE));
    ctx.setCookie(TRUST_COOKIE, value, cookieAttrs(trustCookieOptions));
  }
});

export const auth = betterAuth({
  appName: "Hajj Tracking",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: false }),
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    cookiePrefix: "hajj",
    useSecureCookies: process.env.NODE_ENV === "production",
    // nginx sets X-Real-IP from the connection; a client-built X-Forwarded-For list is not believed.
    ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
  },
  databaseHooks: {
    session: {
      create: {
        // Open every new session in the user's agency, so signing in lands on
        // their dashboard instead of onboarding.
        before: async (session) => {
          const [first] = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .orderBy(asc(schema.member.createdAt))
            .limit(1);
          return { data: { ...session, activeOrganizationId: first?.organizationId ?? null } };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    // A new password signs every other device out.
    revokeSessionsOnPasswordReset: true,
  },
  hooks: { before: beforeHook, after: afterHook },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Every request checks the session row, so signing a device out, removing
    // it or resetting the password ends its session at once, not minutes later.
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
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
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_TTL_SECONDS,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      storeOTP: "hashed",
      disableSignUp: true,
      // The 45-second wait and the daily limit are enforced in the before hook.
      rateLimit: { window: 60, max: 12 },
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type === "forget-password") await sendResetCode(email, otp);
      },
    }),
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
