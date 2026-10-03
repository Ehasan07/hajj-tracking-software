/** Message keys for ledger entries. A source type names what created the entry; its category refines it. */
export const SOURCE_KEYS = [
  "pilgrim_payment",
  "pilgrim_payment_void",
  "pos_sale",
  "pos_sale_void",
  "customer_payment",
  "expense",
  "expense_void",
  "salary",
  "salary_advance",
] as const;

type Translate = { (key: string): string; has(key: string): boolean };

export function sourceLabel(t: Translate, sourceType: string) {
  return t.has(`statements.sources.${sourceType}`)
    ? t(`statements.sources.${sourceType}`)
    : sourceType;
}

/** A category is a payment method for money in, an expense head for money out. */
export function categoryLabel(t: Translate, category: string | null) {
  if (!category) return "";
  if (t.has(`methods.${category}`)) return t(`methods.${category}`);
  if (t.has(`expenses.categories.${category}`)) return t(`expenses.categories.${category}`);
  return category;
}
