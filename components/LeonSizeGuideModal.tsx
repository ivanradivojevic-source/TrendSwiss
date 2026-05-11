'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  LEON_MEN_EU_SIZES,
  LEON_MEN_FOOT_LENGTH_MM,
} from '@/data/leonMenSizeTable';
import {
  LEON_WOMEN_EU_SIZES,
  LEON_WOMEN_FOOT_LENGTH_MM,
} from '@/data/leonWomenSizeTable';

export type LeonSizeGuideVariant = 'men' | 'women';

type TabId = 'measurements' | 'instructions';

/** Leon PDP accent (headers, active tab, toggle). */
const LEON_BLUE = 'bg-[#1e3a5f]';
const LEON_BLUE_TEXT = 'text-[#1e3a5f]';
const LEON_BLUE_BORDER = 'border-[#1e3a5f]';
const LEON_BLUE_RING = 'bg-[#1e3a5f]';

function mmToIn(mm: number): string {
  return (mm / 25.4).toFixed(2);
}

/** Leon uputstvo — lenjir + đon (PNG u /public). */
const INSTRUCTIONS_ILLUSTRATION = '/leon-size-guide-instructions.png';

export default function LeonSizeGuideModal({
  variant,
}: {
  variant: LeonSizeGuideVariant;
}) {
  const t = useTranslations('shop');
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>('measurements');
  const [useInches, setUseInches] = useState(false);

  const { euSizes, footMm } = useMemo(() => {
    if (variant === 'women') {
      return {
        euSizes: LEON_WOMEN_EU_SIZES,
        footMm: LEON_WOMEN_FOOT_LENGTH_MM,
      };
    }
    return {
      euSizes: LEON_MEN_EU_SIZES,
      footMm: LEON_MEN_FOOT_LENGTH_MM,
    };
  }, [variant]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTab('measurements');
          setOpen(true);
        }}
        className={`text-sm font-medium underline decoration-neutral-400 underline-offset-2 hover:opacity-80 ${LEON_BLUE_TEXT}`}
      >
        {t('leonSizeGuide.link')}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="absolute inset-0 bg-black/45" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[101] max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <h2
                id={titleId}
                className="flex-1 text-center text-lg font-semibold text-neutral-900"
              >
                {t('leonSizeGuide.title')}
              </h2>
              <button
                type="button"
                onClick={close}
                className="-mr-1 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                aria-label={t('leonSizeGuide.close')}
              >
                <span aria-hidden className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>
            <div className="border-b border-neutral-200 px-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTab('measurements')}
                    className={`border-b-2 px-2 py-3 text-sm font-medium transition-colors ${
                      tab === 'measurements'
                        ? `${LEON_BLUE_BORDER} text-neutral-900`
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {t('leonSizeGuide.tabMeasurements')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('instructions')}
                    className={`border-b-2 px-2 py-3 text-sm font-medium transition-colors ${
                      tab === 'instructions'
                        ? `${LEON_BLUE_BORDER} text-neutral-900`
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {t('leonSizeGuide.tabInstructions')}
                  </button>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <span
                    className={`text-xs font-semibold ${!useInches ? 'text-neutral-900' : 'text-neutral-400'}`}
                  >
                    {t('leonSizeGuide.unitMm')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useInches}
                    onClick={() => setUseInches((v) => !v)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      useInches ? LEON_BLUE_RING : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        useInches ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-semibold ${useInches ? 'text-neutral-900' : 'text-neutral-400'}`}
                  >
                    {t('leonSizeGuide.unitIn')}
                  </span>
                </div>
              </div>
            </div>
            <div className="max-h-[min(60vh,420px)] overflow-y-auto px-5 py-4">
              {tab === 'measurements' ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className={`${LEON_BLUE} text-left text-white`}>
                      <th className="border border-white/20 px-3 py-2 font-semibold">
                        {t('leonSizeGuide.eu')}
                      </th>
                      <th className="border border-white/20 px-3 py-2 font-semibold">
                        {useInches
                          ? t('leonSizeGuide.footLengthIn')
                          : t('leonSizeGuide.footLengthMm')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {euSizes.map((eu) => {
                      const mm = footMm[eu];
                      return (
                        <tr
                          key={eu}
                          className="border border-neutral-200 bg-white text-neutral-900"
                        >
                          <td className="border border-neutral-200 px-3 py-2 font-medium">
                            {eu}
                          </td>
                          <td className="border border-neutral-200 px-3 py-2 text-neutral-700">
                            {useInches ? mmToIn(mm) : mm}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                  <div className="relative mx-auto h-32 w-32 flex-shrink-0 sm:mx-0 sm:h-36 sm:w-36">
                    <Image
                      src={INSTRUCTIONS_ILLUSTRATION}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="144px"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">
                      {t('leonSizeGuide.howToTitle')}
                    </p>
                    <ol className="mt-3 list-decimal space-y-3 pl-5 text-neutral-700">
                      <li>{t('leonSizeGuide.step1')}</li>
                      <li>{t('leonSizeGuide.step2')}</li>
                      <li>{t('leonSizeGuide.step3')}</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
