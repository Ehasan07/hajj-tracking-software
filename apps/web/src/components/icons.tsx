import type { SVGProps } from "react";

/**
 * Duotone icon set drawn for this product: ink outline, a soft fill, and one
 * accent stroke. `tint` sets the fill, `accent` the highlighted stroke.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number; tint?: string; accent?: string };

function base({ size = 24, tint, accent, ...rest }: IconProps) {
  return {
    svg: {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.5,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      "aria-hidden": true,
      ...rest,
    },
    tint: tint ?? "transparent",
    accent: accent ?? "currentColor",
  };
}

export function KaabaIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-saffron)", ...props });
  return (
    <svg {...svg}>
      <path d="M12 3 4 7v10l8 4 8-4V7z" fill={tint} />
      <path d="M4 7l8 4 8-4M12 11v10" />
      <path d="M4 10.3l8 4 8-4" stroke={accent} strokeWidth={2} />
    </svg>
  );
}

export function PilgrimIcon(props: IconProps) {
  const { svg, tint, accent } = base(props);
  return (
    <svg {...svg}>
      <circle cx="12" cy="6.5" r="2.8" fill={tint} />
      <path d="M6 20.5c.6-4.6 2.9-7.6 6-7.6s5.4 3 6 7.6z" fill={tint} />
      <path d="M9.6 13.4l5.6 6.8" stroke={accent} />
    </svg>
  );
}

export function PassportIcon(props: IconProps) {
  const { svg, tint, accent } = base(props);
  return (
    <svg {...svg}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" fill={tint} />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M8.8 10h6.4M12 6.8c1 .9 1 5.5 0 6.4" stroke={accent} />
      <path d="M9 17h6" />
    </svg>
  );
}

export function InquiryIcon(props: IconProps) {
  const { svg, tint, accent } = base(props);
  return (
    <svg {...svg}>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z"
        fill={tint}
      />
      <path d="M10 7.6a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6 1v.4" stroke={accent} />
      <circle cx="12" cy="12.9" r=".4" fill="currentColor" />
    </svg>
  );
}

export function PaymentIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-saffron)", ...props });
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="8.5" fill={tint} />
      <circle cx="12" cy="12" r="6" stroke={accent} />
      <path d="M10 8.2h3.4M11 8.2c2.4 0 2.4 3.6 0 3.6h-1M9.6 11.8h4M12 11.8v4" />
    </svg>
  );
}

export function ReceiptIcon(props: IconProps) {
  const { svg, tint, accent } = base(props);
  return (
    <svg {...svg}>
      <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" fill={tint} />
      <path d="M9 8h6M9 11.5h6" />
      <path d="M9.2 15.2l1.6 1.4 3-3" stroke={accent} strokeWidth={1.8} />
    </svg>
  );
}

export function MedicineIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-unit-medicine)", ...props });
  return (
    <svg {...svg}>
      <g transform="rotate(-45 12 12)">
        <path d="M12 8.6H8.1a3.4 3.4 0 0 0 0 6.8H12z" fill={tint} />
        <path d="M12 8.6h3.9a3.4 3.4 0 0 1 0 6.8H12z" fill={accent} />
        <rect x="4.7" y="8.6" width="14.6" height="6.8" rx="3.4" />
      </g>
    </svg>
  );
}

export function ZamzamIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-unit-zamzam)", ...props });
  return (
    <svg {...svg}>
      <path d="M12 3c3.5 4.2 6 7.4 6 10.6a6 6 0 0 1-12 0C6 10.4 8.5 7.2 12 3z" fill={tint} />
      <path d="M8.4 14.2c1.2.9 2.4.9 3.6 0s2.4-.9 3.6 0" stroke={accent} />
    </svg>
  );
}

/** Arabic coffee pot (dallah) for Naba Coffee. */
export function DallahIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-unit-coffee)", ...props });
  return (
    <svg {...svg}>
      <circle cx="13" cy="3.6" r="1" />
      <path d="M11 5.4h4l-.5 3.4h-3z" fill={tint} />
      <path d="M9.5 21h7l-.8-5.6c1.4-1 2-2.6 2-4.2v-.4H8.3v.4c0 1.6.6 3.2 2 4.2z" fill={tint} />
      <path d="M8.6 12.2 4 8.6" stroke={accent} />
      <path d="M16.9 12.4c1.8 0 2.6 1.4 2 3.2" />
    </svg>
  );
}

export function SupernovaIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-unit-supernova)", ...props });
  return (
    <svg {...svg}>
      <path
        d="M12 2.5l1.8 6.2 6.2-2.2-4.2 5.5 4.2 5.5-6.2-2.2L12 21.5l-1.8-6.2-6.2 2.2 4.2-5.5-4.2-5.5 6.2 2.2z"
        fill={tint}
      />
      <circle cx="12" cy="12" r="2" fill={accent} stroke="none" />
    </svg>
  );
}

export function HotelIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-unit-hotel)", ...props });
  return (
    <svg {...svg}>
      <path d="M5 21V8a7 5 0 0 1 14 0v13z" fill={tint} />
      <path d="M3.5 21h17" />
      <path d="M10 21v-3.4a2 2 0 0 1 4 0V21" stroke={accent} />
      <path d="M8.5 11h1.5M14 11h1.5M8.5 14h1.5M14 14h1.5" />
    </svg>
  );
}

export function PayrollIcon(props: IconProps) {
  const { svg, tint } = base(props);
  return (
    <svg {...svg}>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h12l1 2" />
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" fill={tint} />
      <path d="M20.5 11.5h-4a2 2 0 0 0 0 4h4" />
      <circle cx="16.6" cy="13.5" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StatementIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-haram)", ...props });
  return (
    <svg {...svg}>
      <path d="M5 3.5h10.5l3.5 3.5v13.5H5z" fill={tint} />
      <path d="M8.5 17v-3M12 17v-6M15.5 17v-4.5" stroke={accent} strokeWidth={2} />
      <path d="M8 7h4" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  const { svg, tint, accent } = base(props);
  return (
    <svg {...svg}>
      <path d="M4 5.5c2.7-1 5.4-1 8 .8v14c-2.6-1.8-5.3-1.8-8-.8z" fill={tint} />
      <path d="M20 5.5c-2.7-1-5.4-1-8 .8v14c2.6-1.8 5.3-1.8 8-.8z" fill={tint} />
      <path d="M6.5 9.5c1.3-.3 2.6-.2 3.8.4" stroke={accent} />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  const { svg } = base({ strokeWidth: 2, ...props });
  return (
    <svg {...svg}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  const { svg } = base({ strokeWidth: 2.2, ...props });
  return (
    <svg {...svg}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  const { svg } = base({ strokeWidth: 2, ...props });
  return (
    <svg {...svg}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  const { svg } = base({ strokeWidth: 2.4, ...props });
  return (
    <svg {...svg}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function PrintIcon(props: IconProps) {
  const { svg, tint } = base(props);
  return (
    <svg {...svg}>
      <path d="M7 8V3.5h10V8" />
      <rect x="3.5" y="8" width="17" height="8.5" rx="2" fill={tint} />
      <path d="M7 14h10v6.5H7z" fill="var(--color-paper)" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  const { svg } = base(props);
  return (
    <svg {...svg}>
      <path d="M5 4h3l1.6 4-2 1.3a10 10 0 0 0 7.1 7.1l1.3-2 4 1.6v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 6.2 2 2 0 0 1 5 4z" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  const { svg } = base(props);
  return (
    <svg {...svg}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  const { svg, accent } = base(props);
  return (
    <svg {...svg}>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" stroke={accent} />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

/** An open mushaf resting on a rehal (folding stand). */
export function QuranIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-saffron-deep)", ...props });
  return (
    <svg {...svg}>
      <path
        d="M3.5 6.5c2.9-1.1 5.8-.8 8.5 1.2 2.7-2 5.6-2.3 8.5-1.2v7c-2.9-1.1-5.8-.8-8.5 1.2-2.7-2-5.6-2.3-8.5-1.2z"
        fill={tint}
      />
      <path d="M12 7.7v7" />
      <path d="M7 20.5l10-5.3M17 20.5 7 15.2" stroke={accent} />
    </svg>
  );
}

/** Two colleagues, the nearer one highlighted. */
export function TeamIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-haram)", ...props });
  return (
    <svg {...svg}>
      <circle cx="15.5" cy="7.5" r="2.6" />
      <path d="M12.6 19.5c.3-3 1.4-5 2.9-5s2.9 1.3 3.6 3.8" />
      <circle cx="9" cy="8.5" r="3" fill={tint} stroke={accent} />
      <path d="M3.8 20c.5-3.6 2.4-5.8 5.2-5.8s4.7 2.2 5.2 5.8z" fill={tint} stroke={accent} />
    </svg>
  );
}

export function TruckIcon(props: IconProps) {
  const { svg, tint, accent } = base({ accent: "var(--color-unit-zamzam)", ...props });
  return (
    <svg {...svg}>
      <path d="M2.5 6.5h11v10h-11z" fill={tint} />
      <path d="M13.5 9.5h4l3 3.5v3.5h-7" />
      <circle cx="7" cy="17.5" r="1.8" fill="var(--color-paper)" stroke={accent} />
      <circle cx="17" cy="17.5" r="1.8" fill="var(--color-paper)" stroke={accent} />
    </svg>
  );
}

export function BoxIcon(props: IconProps) {
  const { svg, tint, accent } = base(props);
  return (
    <svg {...svg}>
      <path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z" fill={tint} />
      <path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9" />
      <path d="m7.8 5.5 8.4 4" stroke={accent} />
    </svg>
  );
}

export function ChevronIcon(props: IconProps & { dir?: "left" | "right" }) {
  const { dir = "right", ...rest } = props;
  const { svg } = base(rest);
  return (
    <svg {...svg}>
      <path d={dir === "right" ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
    </svg>
  );
}
