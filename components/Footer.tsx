import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="bg-neutral-900 py-8 text-center text-sm text-neutral-300">
      {/* Ista tamno siva linija kao na vrhu – top */}
      <div className="h-1 w-full bg-[var(--header-dark)]" aria-hidden />
      <div className="pt-6">
        © {new Date().getFullYear()} <strong className="font-semibold text-white">trendswiss.ch</strong>. {t('rights')}
      </div>
    </footer>
  );
}
