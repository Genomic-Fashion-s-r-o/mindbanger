import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import './personal.css';
import { Suspense } from 'react';
import AffiliateTracker from '@/components/AffiliateTracker';

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
    icon: '/favicon.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mgr. Miroslav Jobus',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className={`${inter.variable} ${playfair.variable} scroll-smooth antialiased`}>
      <body className="bg-slate-950 text-slate-100 font-sans">
        <Suspense fallback={null}>
          <AffiliateTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
