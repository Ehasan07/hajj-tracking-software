export const PILGRIM_STATUS_TONE = {
  registered: "neutral",
  documents: "pending",
  visa: "info",
  ready: "paid",
  travelled: "paid",
  completed: "paid",
  cancelled: "due",
} as const;

export const PILGRIM_STATUSES = Object.keys(PILGRIM_STATUS_TONE) as (keyof typeof PILGRIM_STATUS_TONE)[];
