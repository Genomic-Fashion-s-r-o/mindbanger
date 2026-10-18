import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Mindbanger Daily | Daily mental clarity & focus',
  description: 'Daily mental clarity, focus signals and your personal audio library.',
  robots: { index: false, follow: false },
  manifest: '/mindbanger_daily/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Mindbanger' },
  openGraph: { title: 'Mindbanger Daily', description: 'Daily mental clarity & focus', images: ['/logo.png'] },
};
export default function ProductLayout({ children }: { children: React.ReactNode }) { return children; }
