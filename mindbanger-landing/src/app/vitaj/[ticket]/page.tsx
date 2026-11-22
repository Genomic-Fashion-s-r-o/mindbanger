import {localizedClientMetadata}from '@/lib/portal-metadata';
import{portalLocale}from '@/lib/portal-locale-server';
import{portalPath}from '@/lib/portal-locale';
import PortalElement from '@/components/client/PortalElement';
import { notFound, redirect } from 'next/navigation';
import { getClientContext } from '@/lib/client-context';
import { ClaimBonus } from '@/components/member-funnels/BonusSignup';
export const dynamic = 'force-dynamic';
const baseMetadata = { title: 'Otváram tvoj bonus | Mindbanger', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default async function Page({ params }: {
    params: Promise<{
        ticket: string;
    }>;
}) {
    const { ticket } = await params;
    if (!/^[a-f0-9]{64}$/.test(ticket))
        notFound();
    const context = await getClientContext();
    if (!context)
        redirect(portalPath('/prihlasenie',await portalLocale())+'?metoda=odkaz&next=' + encodeURIComponent(portalPath('/vitaj/' + ticket,await portalLocale())));
    return <PortalElement as="main" className="client-site" style={{ padding: '48px 20px' }}><PortalElement as="div" style={{ maxWidth: 760, margin: 'auto' }}><ClaimBonus ticket={ticket}/></PortalElement></PortalElement>;
}
