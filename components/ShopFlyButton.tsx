'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

export default function ShopFlyButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [flying, setFlying] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (flying) return;
    setFlying(true);
    setTimeout(() => {
      router.push(href);
    }, 1950);
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-0 overflow-visible ${flying ? 'shop-fly-active' : ''}`}
    >
      <span
        className={`relative -mr-3 hidden h-[5.2rem] w-28 flex-shrink-0 overflow-visible sm:block ${flying ? 'wing-flap-left' : 'translate-y-[-0.5cm]'}`}
      >
        <Image
          src="/wing-no-background.png"
          alt=""
          width={112}
          height={83}
          className="h-full w-full object-contain object-center"
          aria-hidden
          unoptimized
        />
      </span>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex h-[3.5rem] items-center justify-center rounded-2xl bg-red-600 px-10 py-4 font-bold text-white shadow-xl ring-4 ring-red-300/50 transition hover:bg-red-700 hover:shadow-2xl hover:ring-red-400/60 focus:outline-none focus:ring-4 focus:ring-red-400"
      >
        {children}
      </button>
      <span
        className={`relative -ml-3 hidden h-[5.2rem] w-28 flex-shrink-0 overflow-visible sm:block ${flying ? 'wing-flap-right' : ''}`}
        style={flying ? undefined : { transform: 'scaleX(-1) translateY(-0.5cm)' }}
      >
        <Image
          src="/wing-no-background.png"
          alt=""
          width={112}
          height={83}
          className="h-full w-full object-contain object-center"
          aria-hidden
          unoptimized
        />
      </span>
    </div>
  );
}
