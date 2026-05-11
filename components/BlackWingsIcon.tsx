'use client';

/**
 * Crna krila kao u logu TrendSwiss – jedno krilo (koristi dva puta, jedno mirror).
 */
export default function BlackWingsIcon({
  className,
  size = 56,
  mirror = false,
}: {
  className?: string;
  size?: number;
  mirror?: boolean;
}) {
  const w = size;
  const h = Math.round((size * 36) / 56);
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 56 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden
    >
      <path
        d="M0 18 C0 8 12 2 28 6 C44 10 56 14 56 18 C56 24 44 30 28 34 C12 34 0 28 0 18 Z"
        fill="#111827"
      />
    </svg>
  );
}
