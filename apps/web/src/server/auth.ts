import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP, organization, twoFactor } from "better-auth/plugins";
import { and, asc, eq } from "drizzle-orm";
import { checkPassword, PASSWORD_MAX, PASSWORD_MIN, siteSlugError } from "@hajj/core";
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
import { clientIp, limitKey } from "./client-ip";

type HookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/** The address the sign-in lockout counts (IPv6 by its /64). */
const hookIp = (ctx: HookContext) => limitKey(clientIp(ctx.headers));

const cookieAttrs = (o: typeof trustCookieOptions) => ({ httpOnly: o.httpOnly, secure: o.secure, sameSite: o.sameSite, path: o.path, maxAge: o.maxAge });

/** Paths that set a password, and the body field that carries it. */
const PASSWORD_FIELDS: Record<string, string> = {
  "/sign-up/email": "password",
  "/email-otp/reset-password": "password",
  "/reset-password": "newPassword",
  "/change-password": "newPassword",
};

/**
 * Before sign-in: refuse a locked email/address pair. Before a reset code:
 * enforce the wait and daily limit. Before any new password: the same rules
 * the form shows, so a request made outside the form can't skip them.
 */
const beforeHook = createAuthMiddleware(async (ctx) => {
  const field = PASSWORD_FIELDS[ctx.path];
  if (field) {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email : "";
    let name = typeof body.name === "string" ? body.name : "";
    if (!name && email) name = (await ctx.context.internalAdapter.findUserByEmail(email.toLowerCase()))?.user.name ?? "";
    if (!checkPassword(String(body[field] ?? ""), { name, email }).ok) {
      throw new APIError("BAD_REQUEST", { message: "WEAK_PASSWORD", code: "WEAK_PASSWORD" });
    }
  }
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
      // The fifth wrong password says so at once: the per-address limit would hide a sixth try.
      if (returned.status === "UNAUTHORIZED" && recordFailure(ip, email)) throw new APIError("TOO_MANY_REQUESTS", { message: "LOCKED" });
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
    // The reset code came by email, so the address is proven too.
    if (!found.user.emailVerified) await ctx.context.internalAdapter.updateUser(found.user.id, { emailVerified: true });
    if (deviceCheckEnabled()) {
      ctx.setCookie(TRUST_COOKIE, await trustDevice(found.user.id, meta, ctx.getCookie(TRUST_COOKIE)), cookieAttrs(trustCookieOptions));
    }
    void sendSecurityAlert(found.user.id, "password", meta);
  }

  // A new account proves its email before it gets a session: a code goes to the address,
  // and the browser that enters it becomes the account's first trusted device. An address
  // nobody reads (a made-up one) never gets past this, so it can't open agencies or trials.
  if (ctx.path === "/sign-up/email" && ctx.context.newSession && deviceCheckEnabled()) {
    const created = ctx.context.newSession;
    const meta = deviceMeta(ctx.headers ?? new Headers());
    await ctx.context.internalAdapter.deleteSession(created.session.token);
    ctx.context.responseHeaders?.delete("set-cookie");
    const challenge = await startDeviceChallenge(created.user.id, created.user.email, meta, unsign(ctx.getCookie(PENDING_COOKIE)), "signup");
    ctx.setCookie(PENDING_COOKIE, sign(challenge.id), cookieAttrs(pendingCookieOptions));
    return ctx.json({ emailVerification: true, email: challenge.email, device: challenge.device, resendIn: challenge.resendIn });
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
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
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
  /**
   * Endpoints the plugins add that this app doesn't use. Each one is a way
   * around a rule the app enforces elsewhere, so they answer 404:
   * - email-code sign-in and its senders would sign in with a 6-digit code
   *   alone, skipping the password and the new-device check, and the extra
   *   reset-code senders skip the reset wait and daily limit;
   * - the organization routes would let an admin change roles, remove or
   *   invite people past the team page's rules and seat limit, rename the
   *   agency's address past the reserved list, delete the agency with its
   *   books, or read every colleague's email.
   * Team changes go through the team page; the address through the website page.
   */
  disabledPaths: [
    "/sign-in/email-otp",
    "/email-otp/send-verification-otp",
    "/forget-password/email-otp",
    "/email-otp/verify-email",
    "/email-otp/request-email-change",
    "/email-otp/change-email",
    "/organization/update",
    "/organization/delete",
    "/organization/invite-member",
    "/organization/accept-invitation",
    "/organization/reject-invitation",
    "/organization/cancel-invitation",
    "/organization/get-invitation",
    "/organization/list-invitations",
    "/organization/list-user-invitations",
    "/organization/remove-member",
    "/organization/update-member-role",
    "/organization/leave",
    "/organization/list-members",
    "/organization/get-full-organization",
  ],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Per address. The lockout (5 wrong passwords per email and address) and the
    // per-account reset limits sit on top of these.
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/organization/create": { window: 60 * 60, max: 5 },
      "/email-otp/request-password-reset": { window: 60 * 60, max: 3 },
      "/email-otp/check-verification-otp": { window: 10 * 60, max: 10 },
      "/email-otp/reset-password": { window: 10 * 60, max: 10 },
      "/change-password": { window: 10 * 60, max: 5 },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      // One agency per owner: each new agency starts a free trial.
      organizationLimit: async (user) => {
        const owned = await db
          .select({ id: schema.member.id })
          .from(schema.member)
          .where(and(eq(schema.member.userId, user.id), eq(schema.member.role, "owner")))
          .limit(1);
        return owned.length > 0;
      },
      disableOrganizationDeletion: true,
      creatorRole: "owner",
      membershipLimit: 500,
      organizationHooks: {
        // The same address rules as the website page, so the API can't take a reserved
        // name or the one the main domain shows.
        beforeCreateOrganization: async ({ organization: org, user: creator }) => {
          // Only an account whose email is proven opens an agency (and its free trial). A
          // trusted browser counts: today one is only given after a code from the inbox, and
          // accounts opened before sign-up asked for a code were trusted when they were made.
          if (deviceCheckEnabled() && !creator.emailVerified) {
            const [trusted] = await db
              .select({ id: schema.trustedDevices.id })
              .from(schema.trustedDevices)
              .where(eq(schema.trustedDevices.userId, creator.id))
              .limit(1);
            if (!trusted) throw new APIError("FORBIDDEN", { message: "EMAIL_NOT_VERIFIED", code: "EMAIL_NOT_VERIFIED" });
          }
          const slug = String(org.slug ?? "");
          const problem = siteSlugError(slug) ?? (slug === process.env.PUBLIC_TENANT_SLUG ? "SLUG_RESERVED" : null);
          if (problem) throw new APIError("BAD_REQUEST", { message: problem, code: problem });
        },
      },
    }),
    twoFactor({ issuer: "Hajj Tracking" }),
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_TTL_SECONDS,
      allowedAttempts: OTP_MAX_ATTEMPTS,
      storeOTP: "hashed",
      disableSignUp: true,
      // Per-address limits are in rateLimit.customRules; the 45-second wait and the
      // daily limit per account are enforced in the before hook.
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type === "forget-password") await sendResetCode(email, otp);
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
