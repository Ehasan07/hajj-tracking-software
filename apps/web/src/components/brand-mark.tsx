import { useId } from "react";

/**
 * The platform's mark: a map pin (tracking) holding the Kaaba (Hajj), on the
 * teal square used for the app icon and favicon. Decorative: the brand name
 * always sits next to it.
 */
export function BrandMark({ className = "h-11 w-11", plain = false }: { className?: string; plain?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`bm-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d8a7c" />
          <stop offset="1" stopColor="#0b4f4a" />
        </linearGradient>
      </defs>
      {plain ? null : <rect width="64" height="64" rx="14" fill={`url(#bm-${id})`} />}
      <g transform={plain ? undefined : "translate(32 33) scale(0.86) translate(-32 -33)"}>
        <path d="M32 59 C27.5 51 13 40.5 13 26 A19 19 0 1 1 51 26 C51 40.5 36.5 51 32 59 Z" fill={plain ? "var(--color-haram)" : "#fbf7ee"} />
        <polygon points="32,14.2 43,19.2 32,24.2 21,19.2" fill="#3a4846" />
        <polygon points="21,19.2 32,24.2 32,38.2 21,33.2" fill="#121a19" />
        <polygon points="32,24.2 43,19.2 43,33.2 32,38.2" fill="#1f2a28" />
        <polygon points="21,22.6 32,27.6 32,30.2 21,25.2" fill="#e3ad3b" />
        <polygon points="32,27.6 43,22.6 43,25.2 32,30.2" fill="#f2c45a" />
        <polygon points="36.4,31.2 39.6,29.8 39.6,34.4 36.4,35.8" fill="#e3ad3b" />
      </g>
    </svg>
  );
}
