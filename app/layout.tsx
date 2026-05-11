import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Trend Swiss Shop | trendswiss.ch', template: '%s | trendswiss.ch' },
  description: 'Online shop – Swiss quality and style. trendswiss.ch',
  metadataBase: new URL('https://trendswiss.ch'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
