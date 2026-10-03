import type { ReactNode } from "react";

const SIZES = {
  a4: "A4 portrait; margin: 12mm",
  a4landscape: "A4 landscape; margin: 10mm",
  a6: "A6 portrait; margin: 5mm",
} as const;

/**
 * A printable document (statement, salary sheet, shop receipt). Only this
 * block prints, on the paper size given; the global rule is A5 for money
 * receipts, and the last @page rule on the page wins.
 */
export function PrintDoc({
  size = "a4",
  className = "",
  children,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <style>{`@media print { @page { size: ${SIZES[size]}; } }`}</style>
      <article className={`print-doc ${className}`}>{children}</article>
    </>
  );
}
