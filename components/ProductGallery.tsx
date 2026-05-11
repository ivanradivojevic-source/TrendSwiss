'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const uniqImages = useMemo(() => Array.from(new Set(images.filter(Boolean))), [images]);
  const list = uniqImages.length ? uniqImages : [];
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const activeSrc = list[active] ?? list[0] ?? '';

  const go = (next: number) => {
    if (!list.length) return;
    const idx = (next + list.length) % list.length;
    setActive(idx);
  };

  const prev = () => go(active - 1);
  const next = () => go(active + 1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, list.length]);

  return (
    <div className="space-y-4">
      <div
        className="aspect-square relative overflow-hidden rounded-xl bg-neutral-100"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX ?? null;
          touchStartX.current = null;
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) < 40) return;
          if (dx > 0) prev();
          else next();
        }}
      >
        {activeSrc ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="absolute inset-0 z-10 cursor-zoom-in"
              aria-label="Open gallery"
            />
            <Image
              src={activeSrc}
              alt={alt}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
            />
            {list.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-900 shadow ring-1 ring-black/5 hover:bg-white"
                  aria-label="Previous image"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-900 shadow ring-1 ring-black/5 hover:bg-white"
                  aria-label="Next image"
                >
                  →
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {list.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              onClick={() => setActive(idx)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                idx === active ? 'border-red-600' : 'border-neutral-200 hover:border-neutral-300'
              }`}
              aria-label={`Image ${idx + 1}`}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[60] bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-full max-w-6xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-full w-full">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-2 top-2 z-20 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-900 shadow ring-1 ring-black/5 hover:bg-white"
                aria-label="Close"
              >
                ✕
              </button>

              {list.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-900 shadow ring-1 ring-black/5 hover:bg-white"
                    aria-label="Previous image"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-neutral-900 shadow ring-1 ring-black/5 hover:bg-white"
                    aria-label="Next image"
                  >
                    →
                  </button>
                </>
              ) : null}

              <div className="relative h-full w-full">
                <Image
                  src={activeSrc}
                  alt={alt}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

