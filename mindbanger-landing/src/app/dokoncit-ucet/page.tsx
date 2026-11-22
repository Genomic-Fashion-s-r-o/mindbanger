import {localizedClientMetadata}from '@/lib/portal-metadata';
import PortalElement from '@/components/client/PortalElement';
import BrandLogo from '@/components/BrandLogo';
import { redirect } from 'next/navigation';
import { requireClient } from '@/lib/client-context';
import { safeClientReturn } from '@/lib/client-platform';
import ClientProfileForm from '@/components/client/ClientProfileForm';
export const dynamic = 'force-dynamic';
const baseMetadata = { title: 'Dokončenie účtu | Mindbanger', robots: { index: false, follow: false } };
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        next?: string;
    }>;
}) {
    const [context, query] = await Promise.all([requireClient(), searchParams]);
    const next = safeClientReturn(query.next);
    if (context.accepted)
        redirect(next);
    return <PortalElement as="div" className="client-site client-onboarding"><BrandLogo className="client-brand" href="/" account/><PortalElement as="main" className="client-card"><PortalElement as="p" className="client-eyebrow">EŠTE JEDEN MALÝ KROK</PortalElement><PortalElement as="h1">Dokončime váš <PortalElement as="em">účet.</PortalElement></PortalElement><PortalElement as="p">Potvrďte údaje a podmienky bezplatného klientského účtu. Neaktivujete tým žiadne predplatné.</PortalElement><ClientProfileForm onboarding name={context.profile?.full_name || ''} email={context.user.email || ''} language={context.profile?.preferred_language || 'sk'} timezone={context.profile?.timezone || 'Europe/Bratislava'} next={next}/></PortalElement></PortalElement>;
}
