import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SmoothScrollToHash from '@/components/SmoothScrollToHash';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as 'de' | 'fr' | 'en' | 'it')) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <SmoothScrollToHash />
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--bg-warm)] text-neutral-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
