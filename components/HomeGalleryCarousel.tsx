'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomeGalleryImage } from '@/src/lib/homeGalleryImages';

const INTERVAL_MS = 5000;
/** 42% + 10% */
const SLIDE_WIDTH_RATIO = 0.462;

function slideDistance(i: number, active: number): number {
  return Math.abs(i - active);
}

function slideVisualClass(distance: number, isActive: boolean): string {
  if (isActive) {
    return 'z-10 scale-100 opacity-100 blur-0 shadow-lg ring-2 ring-red-300/60';
  }
  if (distance === 1) {
    return 'z-0 scale-[0.858] opacity-55 blur-[0.6px] shadow-md ring-1 ring-neutral-200/50';
  }
  if (distance === 2) {
    return 'z-0 scale-[0.726] opacity-35 blur-[1.5px] shadow-sm ring-1 ring-neutral-200/30';
  }
  return 'z-0 scale-[0.638] opacity-20 blur-sm';
}

export default function HomeGalleryCarousel({
  images,
  ariaLabel,
}: {
  images: HomeGalleryImage[];
  ariaLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = images.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateWidth = () => {
      setSlideWidth(viewport.clientWidth * SLIDE_WIDTH_RATIO);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(viewport);
    window.addEventListener('resize', updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || slideWidth <= 0) return;

    const centerActive = () => {
      const slideEl = track.children[index] as HTMLElement | undefined;
      if (!slideEl) return;
      const slideCenter = slideEl.offsetLeft + slideEl.offsetWidth / 2;
      setTranslateX(viewport.clientWidth / 2 - slideCenter);
    };

    centerActive();
    const id = requestAnimationFrame(centerActive);
    return () => cancelAnimationFrame(id);
  }, [index, slideWidth, images.length]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;

  if (count === 1) {
    const image = images[0];
    return (
      <div className="mx-auto max-w-lg px-4">
        <div className="overflow-hidden rounded-2xl bg-neutral-100 shadow-md ring-1 ring-red-200/40">
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            className="block h-auto w-full"
            sizes="(max-width: 768px) 95vw, 512px"
            priority
            unoptimized
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto max-w-6xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="relative"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-red-50/90 to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-red-50/90 to-transparent sm:w-16" />

        <div ref={viewportRef} className="overflow-hidden py-2">
          <div
            ref={trackRef}
            className="flex items-center transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(${translateX}px)` }}
          >
            {images.map((image, i) => {
              const distance = slideDistance(i, index);
              const isActive = i === index;
              return (
                <div
                  key={image.src}
                  data-slide
                  className="flex-shrink-0 px-2"
                  style={{ width: slideWidth > 0 ? slideWidth : `${SLIDE_WIDTH_RATIO * 100}%` }}
                >
                  <button
                    type="button"
                    onClick={() => !isActive && goTo(i)}
                    className={`block w-full overflow-hidden rounded-2xl bg-neutral-100 transition-all duration-700 ease-in-out ${slideVisualClass(distance, isActive)} ${
                      isActive ? 'pointer-events-none' : 'cursor-pointer hover:opacity-80'
                    }`}
                    aria-label={`Slide ${i + 1}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <Image
                      src={image.src}
                      alt=""
                      width={image.width}
                      height={image.height}
                      className="block h-auto w-full"
                      sizes={
                        isActive
                          ? '(max-width: 768px) 46vw, 531px'
                          : '(max-width: 768px) 32vw, 360px'
                      }
                      {...(i === 0 && index === 0
                        ? { priority: true }
                        : distance > 1
                          ? { loading: 'lazy' as const }
                          : {})}
                      unoptimized
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={goPrev}
          className="absolute left-1 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-md ring-1 ring-black/5 transition hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 sm:left-2"
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goNext}
          className="absolute right-1 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-md ring-1 ring-black/5 transition hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 sm:right-2"
          aria-label="Next slide"
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            onClick={() => goTo(i)}
            className={`h-2.5 rounded-full transition-all ${
              i === index ? 'w-8 bg-red-600' : 'w-2.5 bg-neutral-300 hover:bg-red-300'
            }`}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
}
