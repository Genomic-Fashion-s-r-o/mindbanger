import { headers } from 'next/headers';
import { readerDir } from '@/lib/readers/locale';
import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import './personal.css';
import './client.css';
import './brand.css';
import { Suspense } from 'react';
import AffiliateTracker from '@/components/AffiliateTracker';
import PublicAnalytics from '@/components/marketing/PublicAnalytics';
import BookingAttribution from '@/components/marketing/BookingAttribution';
import { LanguageProvider } from '@/components/LanguageProvider';
import { getDictionary } from '@/lib/i18n';
import { siteLocale } from '@/lib/site-locale-server';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Mgr. Miroslav Jobus | Hypnóza a mentálny tréning',
  description: 'Hypnóza, relaxácia, coaching a mentálny tréning s Mgr. Miroslavom Jobusom online.',
  icons: {
    icon: '/mindbanger-gold-logo.png',
    apple: '/mindbanger-gold-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mgr. Miroslav Jobus',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await siteLocale();
  const readerLanguage = (await headers()).get('x-reader-locale');
  return (
    <html lang={readerLanguage || locale} dir={readerLanguage ? readerDir(readerLanguage) : undefined} className={`${inter.variable} ${playfair.variable} scroll-smooth antialiased`}>
      <body className="bg-slate-950 text-slate-100 font-sans">
       <LanguageProvider dict={getDictionary(locale)} lang={locale}>
        <Suspense fallback={null}>
          {!readerLanguage && <AffiliateTracker />}
        </Suspense>
        {children}
        {!readerLanguage && <PublicAnalytics />}
        {!readerLanguage && <BookingAttribution />}
       </LanguageProvider>
      </body>
    </html>
  );
}
