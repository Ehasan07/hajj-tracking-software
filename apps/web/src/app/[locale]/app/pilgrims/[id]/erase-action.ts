"use server";

import { TRPCError } from "@trpc/server";
import { describeError } from "@hajj/api/errors";
import { deleteObjects } from "@/server/storage";
import { api } from "@/trpc/server";

/** Erase a pilgrim's details, then their stored papers and scans at once (the nightly clean-up catches any it misses). */
export async function erasePilgrim(id: string, confirmRef: string): Promise<{ ok: true } | { error: string }> {
  try {
    const { fileKeys } = await (await api()).pilgrims.erase({ id, confirmRef });
    await deleteObjects(fileKeys).catch((error: unknown) => console.warn(`[erase] files left for clean-up: ${describeError(error)}`));
    return { ok: true };
  } catch (error) {
    if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") return { error: error.message };
    console.error(`[erase] pilgrim ${describeError(error)}`);
    return { error: "INTERNAL" };
  }
}
