/** Map a server error code (e.g. "OVERPAYMENT:38999950") to a message key and its argument. */
export function errorKey(error: unknown): { key: string; arg?: string } {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const [code = "", arg] = message.split(":");
  const known = [
    "FORBIDDEN",
    "NOT_FOUND",
    "INVALID_PHONE",
    "INVALID_AMOUNT",
    "INVALID_PASSPORT",
    "PACKAGE_UNAVAILABLE",
    "INVALID_DISCOUNT",
    "REFERENCE_REQUIRED",
    "ALREADY_VOID",
    "PILGRIM_CANCELLED",
    "SLUG_TAKEN",
    "TOO_LARGE",
    "UNSUPPORTED_TYPE",
    "INVALID_SLUG",
  ];
  if (known.includes(code)) return { key: code, arg };
  if (code === "OVERPAYMENT" || code === "DUPLICATE_PASSPORT") return { key: code, arg };
  // Zod validation errors arrive as JSON; pick the first known message inside.
  for (const k of known) if (message.includes(k)) return { key: k };
  return { key: "generic" };
}
