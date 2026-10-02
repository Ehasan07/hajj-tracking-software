"use client";

import { useEffect, useState } from "react";

/*
 * Night at the Sacred Mosque, drawn by hand in SVG: the Kaabah with its gold
 * band, the arcades and minarets behind, and pilgrims circling it
 * anticlockwise (Kaabah on their left). Pilgrims move only when the visitor
 * has not asked for reduced motion.
 */

const STARS: [number, number, number][] = [
  [42, 46, 1.3], [88, 92, 1], [126, 38, 1.6], [168, 74, 1], [214, 30, 1.2], [252, 96, 1],
  [292, 44, 1.4], [72, 140, 1], [118, 118, 1.2], [356, 128, 1], [380, 60, 1.1], [24, 108, 1],
  [150, 160, 0.9], [240, 150, 1], [330, 170, 0.9], [60, 196, 0.8], [198, 112, 1.1], [276, 196, 0.8],
];

// Anticlockwise when seen from above: the near side of each ring runs left to right.
const RING = (rx: number, ry: number, cy: number) =>
  `M ${200 - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 ${-rx * 2},0`;

const OUTER = RING(156, 54, 402);
const INNER = RING(112, 38, 396);

export function KaabaScene({ label }: { label: string }) {
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    setMoving(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const pilgrims = (path: string, count: number, dur: number, r: number, fill: string) =>
    Array.from({ length: count }, (_, i) => {
      const begin = `-${((dur / count) * i).toFixed(2)}s`;
      return (
        <circle key={`${path.length}-${i}`} r={r} fill={fill} opacity={0.9}>
          {moving ? <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" path={path} /> : null}
        </circle>
      );
    });

  return (
    <svg viewBox="0 0 400 500" role="img" aria-label={label} className="h-full w-full">
      <rect width="400" height="500" fill="#0b4f4a" />

      {STARS.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill="#f4f6f5"
          className="animate-[twinkle_3.4s_ease-in-out_infinite]"
          style={{ animationDelay: `${(i * 0.37) % 3.4}s` }}
        />
      ))}

      {/* crescent */}
      <circle cx="318" cy="78" r="22" fill="#f2b33d" />
      <circle cx="329" cy="70" r="20" fill="#0b4f4a" />

      {/* minarets */}
      {(
        [
          [34, 0.9],
          [354, 1],
          [96, 0.7],
          [296, 0.75],
        ] as const
      ).map(([x, s]) => (
        <g key={x} transform={`translate(${x} ${330 - 170 * s}) scale(${s})`} fill="#14635d">
          <path d="M-2 -26 L0 -40 L2 -26 Z" fill="#c9a24a" />
          <path d="M-7 -12 Q0 -30 7 -12 Z" />
          <rect x="-7" y="-12" width="14" height="40" />
          <rect x="-10" y="26" width="20" height="5" rx="1.5" />
          <rect x="-6" y="31" width="12" height="60" />
          <rect x="-10" y="88" width="20" height="5" rx="1.5" />
          <rect x="-8" y="93" width="16" height="80" />
        </g>
      ))}

      {/* arcade of the mosque */}
      <g fill="#14635d">
        <rect x="0" y="300" width="400" height="44" />
        {Array.from({ length: 13 }, (_, i) => (
          <path key={i} d={`M ${i * 32 - 2} 344 v -22 a 12 14 0 0 1 24 0 v 22 z`} fill="#0f5a54" />
        ))}
        <rect x="0" y="296" width="400" height="4" fill="#1c7068" />
      </g>

      {/* marble floor and the rings of tawaf */}
      <ellipse cx="200" cy="410" rx="200" ry="78" fill="#e9efed" opacity="0.1" />
      <path d={OUTER} fill="none" stroke="#a9cfc9" strokeOpacity="0.28" strokeDasharray="2 5" />
      <path d={INNER} fill="none" stroke="#a9cfc9" strokeOpacity="0.28" strokeDasharray="2 5" />

      {/* soft light around the House */}
      <circle cx="200" cy="330" r="96" fill="#f2b33d" opacity="0.06" />

      {pilgrims(OUTER, 22, 46, 2.6, "#f4f6f5")}
      {pilgrims(INNER, 14, 32, 2.3, "#ffffff")}

      {/* the Kaabah */}
      <g>
        <polygon points="200,262 254,284 200,306 146,284" fill="#1f2b2a" />
        <polygon points="146,284 200,306 200,388 146,366" fill="#0d1615" />
        <polygon points="200,306 254,284 254,366 200,388" fill="#16211f" />
        {/* gold band (hizam) with a hint of calligraphy */}
        <polygon points="146,298 200,320 200,331 146,309" fill="#c9a24a" />
        <polygon points="200,320 254,298 254,309 200,331" fill="#d8b25a" />
        <path d="M152 303.5 l6 2.4 m4 1.6 l7 2.9 m4 1.6 l5 2 m4 1.6 l7 2.8" stroke="#8a6416" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M206 323 l6 -2.4 m4 -1.6 l7 -2.9 m4 -1.6 l5 -2 m4 -1.6 l7 -2.8" stroke="#8a6416" strokeWidth="1.1" strokeLinecap="round" />
        {/* door */}
        <polygon points="222,346 238,339.5 238,367 222,373.5" fill="#c9a24a" />
        <polygon points="225,347.5 235,343.5 235,365 225,369" fill="#a57a22" />
      </g>
    </svg>
  );
}
