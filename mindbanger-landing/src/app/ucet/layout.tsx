import { redirect } from 'next/navigation';
import { requireClient } from '@/lib/client-context';
import ClientShell from '@/components/client/ClientShell';
import { headers } from 'next/headers';
import { safeClientReturn } from '@/lib/client-platform';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Môj účet | Mindbanger', robots: { index: false, follow: false }, manifest: '/mindbanger_daily/manifest.webmanifest', openGraph: { title: 'Môj účet | Mindbanger', images: ['/logo.png'] } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const context = await requireClient();
  if (!context.accepted) redirect('/dokoncit-ucet?next=' + encodeURIComponent(safeClientReturn((await headers()).get('x-client-return'))));
  return <ClientShell name={context.profile?.full_name || 'Môj účet'}>{children}</ClientShell>;
}
