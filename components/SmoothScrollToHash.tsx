'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Kad korisnik klikne na About / Contact ili dođe na stranicu sa #about / #contact,
 * polako skroluje do tog odeljka.
 */
export default function SmoothScrollToHash() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash) return;
    const id = hash.slice(1);
    if (!id) return;

    const scrollToEl = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const t = setTimeout(scrollToEl, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
