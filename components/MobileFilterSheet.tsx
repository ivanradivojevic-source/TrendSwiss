'use client';

import { useEffect, useState } from 'react';

export default function MobileFilterSheet({
  title,
  buttonLabel,
  closeLabel,
  children,
}: {
  title: string;
  buttonLabel: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Sticky mobile button */}
      <div className="lg:hidden fixed inset-x-0 bottom-3 z-40 flex justify-center px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-4 text-base font-semibold text-white shadow-2xl ring-1 ring-black/10"
        >
          {buttonLabel}
        </button>
      </div>

      {open ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-bold text-neutral-900">{title}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900"
                >
                  {closeLabel}
                </button>
              </div>
            </div>

            <div className="p-4 pb-24">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

