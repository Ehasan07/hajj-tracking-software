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
    "INVALID_NID",
    "REASON_REQUIRED",
    "NOT_READY",
    "UNKNOWN_DOCUMENT",
    "SUBSCRIPTION_INACTIVE",
    "EMPTY_CART",
    "INVALID_QTY",
    "INVALID_PAID",
    "CUSTOMER_REQUIRED",
    "PRODUCT_UNAVAILABLE",
    "UNIT_DISABLED",
    "UNIT_NOT_IN_PLAN",
    "BATCH_REQUIRED",
    "EXPIRED_BATCH",
    "NEGATIVE_STOCK",
    "NO_STOCK_TRACKING",
    "CODE_TAKEN",
    "SHEET_LOCKED",
    "SHEET_PAID",
    "SHEET_NOT_LOCKED",
    "EMPTY_SHEET",
    "NEGATIVE_NET",
    "INVALID_SALARY",
    "ROOM_FULL",
    "ROOM_OUT_OF_RANGE",
    "ROOMS_IN_USE",
    "BOOKING_CANCELLED",
    "INVALID_DATES",
    "EMAIL_TAKEN",
    "UNITS_REQUIRED",
    "CANNOT_CHANGE_OWNER",
    "WEAK_PASSWORD",
    "BACKDATE_NOT_ALLOWED",
    "BACKDATE_TOO_OLD",
    "FUTURE_DATE",
    "INVALID_PERIOD",
  ];
  /** Codes that carry a value after the colon, e.g. "OUT_OF_STOCK:Napa 500". */
  const withArg = [
    "OVERPAYMENT",
    "DUPLICATE_PASSPORT",
    "PLAN_LIMIT",
    "OUT_OF_STOCK",
    "ADVANCE_EXCEEDS",
    "PILGRIM_DOUBLE_BOOKED",
    "SEAT_LIMIT",
  ];
  if (known.includes(code)) return { key: code, arg };
  if (withArg.includes(code)) return { key: code, arg: message.slice(code.length + 1) || arg };
  // Zod validation errors arrive as JSON; pick the first known message inside.
  for (const k of [...known, ...withArg]) if (message.includes(k)) return { key: k };
  return { key: "generic" };
}
