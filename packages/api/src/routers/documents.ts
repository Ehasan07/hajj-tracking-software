import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { documentType } from "@hajj/core";
import { pilgrimDocuments, pilgrims } from "@hajj/db/schema";
import { router, tenantProcedure, withRoles } from "../trpc";

export const documentsRouter = router({
  /** Record an uploaded file. Called by the upload route after the file is stored encrypted. */
  attach: tenantProcedure
    .input(
      z.object({
        pilgrimId: z.uuid(),
        type: z.string().max(40),
        key: z.string().min(10).max(300),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        sizeBytes: z.number().int().positive().max(8 * 1024 * 1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const type = documentType(input.type);
      if (!type) throw new TRPCError({ code: "BAD_REQUEST", message: "UNKNOWN_DOCUMENT" });
      if (type.imageOnly && input.contentType === "application/pdf") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "UNSUPPORTED_TYPE" });
      }
      if (!input.key.startsWith(`tenants/${ctx.tenantId}/pilgrims/${input.pilgrimId}/`)) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      const [owner] = await ctx.tx.select({ id: pilgrims.id }).from(pilgrims).where(eq(pilgrims.id, input.pilgrimId));
      if (!owner) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.tx
        .insert(pilgrimDocuments)
        .values({
          pilgrimId: input.pilgrimId,
          type: input.type,
          fileKey: input.key,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
        })
        .returning({ id: pilgrimDocuments.id });
      return row!;
    }),

  /** Office check of a paper: verified, or rejected with a reason the pilgrim can act on. */
  review: withRoles("admin", "accountant", "staff")
    .input(
      z.object({
        id: z.uuid(),
        status: z.enum(["verified", "rejected"]),
        note: z.string().trim().max(300).optional(),
        expiresOn: z.iso.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.status === "rejected" && !input.note) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "REASON_REQUIRED" });
      }
      const [row] = await ctx.tx
        .update(pilgrimDocuments)
        .set({
          status: input.status,
          note: input.note ?? null,
          expiresOn: input.expiresOn ?? null,
          reviewedBy: ctx.session.userId,
          reviewedAt: new Date(),
        })
        .where(eq(pilgrimDocuments.id, input.id))
        .returning({ id: pilgrimDocuments.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /** Storage key for viewing one document (the route decrypts and streams it). */
  file: tenantProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({ key: pilgrimDocuments.fileKey, contentType: pilgrimDocuments.contentType })
      .from(pilgrimDocuments)
      .where(eq(pilgrimDocuments.id, input.id));
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  /** The newest photo that has not been rejected, for avatars. */
  photo: tenantProcedure.input(z.object({ pilgrimId: z.uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.tx
      .select({ key: pilgrimDocuments.fileKey, contentType: pilgrimDocuments.contentType })
      .from(pilgrimDocuments)
      .where(
        and(
          eq(pilgrimDocuments.pilgrimId, input.pilgrimId),
          eq(pilgrimDocuments.type, "photo"),
          ne(pilgrimDocuments.status, "rejected"),
        ),
      )
      .orderBy(desc(pilgrimDocuments.uploadedAt))
      .limit(1);
    return row ?? null;
  }),
});
