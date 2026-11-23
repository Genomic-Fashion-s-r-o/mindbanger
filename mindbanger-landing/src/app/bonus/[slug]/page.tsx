import {localizedClientMetadata}from '@/lib/portal-metadata';
import PortalElement from '@/components/client/PortalElement';
import { notFound } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import { getClientContext } from '@/lib/client-context';
import { publicFunnel } from '@/lib/member-funnels/store';
import { BonusSignup } from '@/components/member-funnels/BonusSignup';
export const dynamic = 'force-dynamic';
const baseMetadata = { title: 'Tvoj bonus zdarma | Mindbanger', referrer: 'no-referrer' as const };
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default async function Page({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { slug } = await params;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
        notFound();
    const [funnel, context] = await Promise.all([publicFunnel(slug), getClientContext()]);
    if (!funnel)
        notFound();
    return <PortalElement as="div" className="client-site" style={{ padding: '32px 20px' }}><PortalElement as="div" style={{ maxWidth: 760, margin: 'auto', display: 'grid', gap: 32 }}><BrandLogo className="client-brand" href="/"/><BonusSignup {...funnel} signedInEmail={context?.user.email}/></PortalElement></PortalElement>;
}
