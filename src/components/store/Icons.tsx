// Brand glyphs not shipped with lucide + the botanical line-art used in the footer / promo accents.
export function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.6 6.7a4.9 4.9 0 0 1-3.8-4.2h-3.3v13.1a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V9.6a6 6 0 1 0 5.2 5.9V9a8 8 0 0 0 4.6 1.5V7.2a4.9 4.9 0 0 1-.8-.5Z" />
    </svg>
  );
}

const LEAVES = [
  'M92 196c-22-4-38-18-44-40 22 2 38 16 44 40Z', 'M88 160c24-6 40-22 44-44-24 4-40 20-44 44Z', 'M96 122c-24-6-38-22-42-44 24 4 38 20 42 44Z',
  'M100 88c22-8 34-24 36-46-22 6-34 22-36 46Z', 'M104 56c-18-6-28-20-30-38 18 4 28 18 30 38Z', 'M70 232c-18-2-30-12-36-28 18 0 30 10 36 28Z', 'M72 214c16-8 24-22 26-38-16 6-24 20-26 38Z',
];

/** Delicate botanical branch (stroke only). Rotate/flip with CSS. */
export function Botanical({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 260" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M80 258C78 200 84 140 100 70 108 38 110 18 108 4" />
      {LEAVES.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
