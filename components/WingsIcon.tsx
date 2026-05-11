'use client';

/**
 * Krila / swoosh iz loga Trend Swiss Shop – crveno sa zlatnim obrisom.
 * variant="light" = belo/zlatno za crvena dugmad.
 */
export default function WingsIcon({
  className,
  size = 40,
  variant = 'default',
}: {
  className?: string;
  size?: number;
  variant?: 'default' | 'light';
}) {
  const h = (size * 56) / 80;
  const isLight = variant === 'light';
  const outer = isLight ? '#FCD34D' : '#D97706';
  const inner = isLight ? '#FEF3C7' : '#DC2626';
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 80 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M6 38 C6 20 28 6 50 10 C72 14 76 26 72 38 C68 50 46 54 28 48 L28 44 C44 50 62 46 66 34 C70 22 52 18 32 20 C14 22 10 34 10 38 Z"
        fill={outer}
      />
      <path
        d="M12 36 C12 24 28 14 46 16 C64 18 68 26 66 34 C64 42 48 46 32 42 L32 38 C44 42 58 40 60 32 C62 24 50 22 36 24 C22 26 14 32 12 36 Z"
        fill={inner}
      />
    </svg>
  );
}
