'use client';

/**
 * Zastave kao SVG – uvek se vide (i na Windows-u gde emoji zastave ne rade).
 */
function FlagIcon({
  code,
  size = 24,
  className = '',
}: {
  code: 'de' | 'fr' | 'en' | 'it';
  size?: number;
  className?: string;
}) {
  const style = { borderRadius: 4 };

  if (code === 'de') {
    return (
      <svg viewBox="0 0 60 60" width={size} height={size} className={`flex-shrink-0 ${className}`} style={style} fill="none">
        <rect width="60" height="60" fill="#FF0000" />
        <path d="M30 12v36M12 30h36" stroke="#FFF" strokeWidth="12" strokeLinecap="round" />
      </svg>
    );
  }
  if (code === 'fr') {
    return (
      <svg viewBox="0 0 60 40" width={size * 1.5} height={size} className={`flex-shrink-0 ${className}`} style={style} fill="none">
        <rect width="60" height="40" fill="#002395" />
        <rect x="20" width="20" height="40" fill="#FFF" />
        <rect x="40" width="20" height="40" fill="#ED2939" />
      </svg>
    );
  }
  if (code === 'it') {
    return (
      <svg viewBox="0 0 60 40" width={size * 1.5} height={size} className={`flex-shrink-0 ${className}`} style={style} fill="none">
        <rect width="60" height="40" fill="#FFF" />
        <rect width="20" height="40" fill="#009246" />
        <rect x="40" width="20" height="40" fill="#CE2B37" />
      </svg>
    );
  }
  // en = UK
  return (
    <svg viewBox="0 0 60 30" width={size * 2} height={size} className={`flex-shrink-0 ${className}`} style={style} fill="none">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0l60 30M60 0L0 30" stroke="#FFF" strokeWidth="4" />
      <path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" strokeWidth="2.5" />
      <path d="M30 0v30M0 15h60" stroke="#FFF" strokeWidth="6" />
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="4" />
    </svg>
  );
}

export default FlagIcon;
