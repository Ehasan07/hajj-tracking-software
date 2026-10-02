"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { normalizeBdPhone } from "@hajj/core";
import { db, withTenant } from "@hajj/db";
import { inquiries, travelPackages } from "@hajj/db/schema";
import { and, eq } from "drizzle-orm";
import { getSettings, nextReference } from "@hajj/api/services/tenant";
import { allow } from "@/server/rate-limit";
import { PUBLIC_ACTOR, resolvePublicTenant } from "@/server/site";

type Values = Partial<Record<"name" | "phone" | "interest" | "packageId" | "partySize" | "notes", string>>;

export type InquiryState =
  | { status: "idle"; values?: Values }
  | { status: "ok"; ref: string }
  | {
      status: "error";
      code: "INVALID_PHONE" | "INVALID_NAME" | "TOO_MANY" | "UNAVAILABLE" | "generic";
      /** Echoed back so the form can be refilled; React resets a form after every action. */
      values: Values;
    };

function echo(form: FormData): Values {
  const pick = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.slice(0, 1000) : undefined;
  };
  return {
    name: pick("name"),
    phone: pick("phone"),
    interest: pick("interest"),
    packageId: pick("packageId"),
    partySize: pick("partySize"),
    notes: pick("notes"),
  };
}

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
  interest: z.enum(["hajj", "umrah", "other"]),
  packageId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  partySize: z.coerce.number().int().min(1).max(50).default(1),
  notes: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot: real visitors never fill it
});

/** Public inquiry form. Lands in the agency's inquiry log with status "new". */
export async function submitInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const values = echo(form);
  if (!allow(`inquiry:${ip}`, 5, 10 * 60_000)) return { status: "error", code: "TOO_MANY", values };

  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "website") return { status: "ok", ref: "" }; // quietly drop bots
    return { status: "error", code: field === "name" ? "INVALID_NAME" : "generic", values };
  }
  const phone = normalizeBdPhone(parsed.data.phone);
  if (!phone) return { status: "error", code: "INVALID_PHONE", values };

  const tenantId = await resolvePublicTenant();
  if (!tenantId) return { status: "error", code: "UNAVAILABLE", values };

  try {
    const ref = await withTenant(db, { tenantId, userId: PUBLIC_ACTOR }, async (tx) => {
      // A package id from the form must be one of this agency's active packages (RLS limits the lookup).
      let packageId = parsed.data.packageId;
      if (packageId) {
        const [pkg] = await tx
          .select({ id: travelPackages.id })
          .from(travelPackages)
          .where(and(eq(travelPackages.id, packageId), eq(travelPackages.active, true)));
        packageId = pkg?.id;
      }
      const settings = await getSettings(tx);
      const reference = await nextReference(tx, settings, "inquiry");
      await tx.insert(inquiries).values({
        ref: reference,
        name: parsed.data.name,
        phone,
        interest: parsed.data.interest,
        packageId,
        partySize: parsed.data.partySize,
        notes: parsed.data.notes ? `[ওয়েবসাইট] ${parsed.data.notes}` : "[ওয়েবসাইট]",
        createdBy: PUBLIC_ACTOR,
      });
      return reference;
    });
    return { status: "ok", ref };
  } catch (error) {
    console.error("[site] inquiry failed", error);
    return { status: "error", code: "generic", values };
  }
}
