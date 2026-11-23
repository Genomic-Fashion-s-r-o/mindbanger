import {localizedClientMetadata}from '@/lib/portal-metadata';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { PersonalShell } from '@/components/personal/PersonalShell';
import TimeRequestForm from '@/components/booking/TimeRequestForm';
import { getLocalizedBookingSettings } from '@/lib/booking/store';
import { getClientContext } from '@/lib/client-context';
import { localizedPath } from '@/lib/site-locale';
export const dynamic = 'force-dynamic';
const baseMetadata = { title: 'Individuálny termín | Mindbanger', robots: { index: false, follow: true } };
export async function generateMetadata(){return localizedClientMetadata(baseMetadata);}
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        sluzba?: string;
    }>;
}) {
    const [{ settings, locale }, context, query] = await Promise.all([getLocalizedBookingSettings(), getClientContext().catch(() => null), searchParams]);
    const cs = locale === 'cs';
    return <PersonalShell settings={settings}><PortalElement as="main" className="time-request-page" id="obsah"><Link href={localizedPath('/rezervacia', locale)}>← {cs ? 'Zpět do kalendáře' : 'Späť do kalendára'}</Link><PortalElement as="h1">{cs ? 'Najdeme čas individuálně.' : 'Nájdeme čas individuálne.'}</PortalElement><PortalElement as="p" className="time-request-intro">{cs ? 'Nenašel/a jsi volný termín, který ti vyhovuje? Napiš, kdy máš prostor. Ozvu se ti osobně a zkusíme najít řešení.' : 'Nenašiel/a si voľný termín, ktorý ti vyhovuje? Napíš, kedy máš priestor. Ozvem sa ti osobne a skúsime nájsť riešenie.'}</PortalElement><TimeRequestForm locale={locale} name={context?.profile?.full_name || ''} email={context?.user.email || ''} serviceId={query.sluzba || ''} services={settings.services.filter(s => s.active).map(s => ({ id: s.id, name: s.name }))}/></PortalElement></PersonalShell>;
}
