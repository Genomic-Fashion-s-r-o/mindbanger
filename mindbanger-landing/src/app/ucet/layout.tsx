import {localizedClientMetadata}from '@/lib/portal-metadata';
import {portalPath,barePath} from '@/lib/portal-locale';
import { redirect } from 'next/navigation';
import { requireClient } from '@/lib/client-context';
import ClientShell from '@/components/client/ClientShell';
import { headers } from 'next/headers';
import { safeClientReturn } from '@/lib/client-platform';
import { siteLocale } from '@/lib/site-locale-server';
import {pendingFunnel} from '@/lib/member-funnels/store';
export const dynamic = 'force-dynamic';
const baseMetadata = { title: 'Môj účet | Mindbanger', robots: { index: false, follow: false }, manifest: '/mindbanger_daily/manifest.webmanifest', openGraph: { title: 'Môj účet | Mindbanger', images: ['/logo.png'] } };
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default async function Layout({ children }: { children: React.ReactNode }) {
  const [context,locale] = await Promise.all([requireClient(),siteLocale()]);
  if (!context.accepted) redirect(portalPath('/dokoncit-ucet',locale)+'?next=' + encodeURIComponent(safeClientReturn((await headers()).get('x-client-return'))));
  const path=safeClientReturn((await headers()).get('x-client-return')).replace(/^\/(cz|en)(?=\/)/,'');
  if(!path.startsWith('/ucet/ponuka/')){const offer=await pendingFunnel(context.user.id);if(offer)redirect(portalPath('/ucet/ponuka/'+offer,locale));}
  return <ClientShell name={context.profile?.full_name || (locale==='cs'?'Můj účet':'Môj účet')} locale={locale}>{children}</ClientShell>;
}
