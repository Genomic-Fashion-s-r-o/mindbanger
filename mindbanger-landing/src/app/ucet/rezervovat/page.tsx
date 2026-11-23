import PortalElement from '@/components/client/PortalElement';
import TimeRequestCallout from '@/components/booking/TimeRequestCallout';
import { requireClient } from '@/lib/client-context';
import { getLocalizedBookingSettings } from '@/lib/booking/store';
import ClientBookingCalendar from '@/components/client/ClientBookingCalendar';
import { resolveBookingTopic } from '@/lib/booking/offer';
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        sluzba?: string;
        tema?: string;
        termin?: string;
        balik?: string;
        kredit?: string;
        dlzka?: string;
    }>;
}) {
    const [context, { settings, installed }, query] = await Promise.all([requireClient(), getLocalizedBookingSettings(), searchParams]);
    const topic = resolveBookingTopic(query.tema, query.sluzba);
    const cs = settings.locale === 'cs';
    return <><PortalElement as="header" className="client-page-heading"><PortalElement as="div"><PortalElement as="p" className="client-eyebrow">{cs ? 'INDIVIDUÁLNÍ ONLINE KOUČINK' : 'INDIVIDUÁLNY ONLINE COACHING'}</PortalElement><PortalElement as="h1">{cs ? 'Vyber si' : 'Vyber si'} <PortalElement as="em">{cs ? 'svůj čas.' : 'svoj čas.'}</PortalElement></PortalElement><PortalElement as="p">{cs ? 'Cena a délka podle vybrané služby.' : 'Cena a trvanie podľa vybranej služby.'} {settings.paymentMode === 'authorize_confirm' ? (cs ? 'Nejprve blokace ceny objednávky na kartě přes Stripe, stržení po potvrzení termínu a následně odkaz na videohovor.' : 'Najprv blokácia ceny objednávky na karte cez Stripe, strhnutie po potvrdení termínu a následne odkaz na videohovor.') : (cs ? 'Platba přes Stripe po osobním potvrzení termínu.' : 'Platba cez Stripe po osobnom potvrdení termínu.')} {cs ? 'Bez předplatného.' : 'Bez predplatného.'}</PortalElement></PortalElement></PortalElement>{installed && settings.enabled && settings.stripeEnabled ? <ClientBookingCalendar settings={settings} name={context.profile?.full_name || ''} email={context.user.email || ''} initialService={query.sluzba} initialPackage={query.balik} initialCredit={query.kredit} initialDuration={Number(query.dlzka) || 0} initialTopic={topic} initialStart={query.termin}/> : <><TimeRequestCallout locale={settings.locale} serviceId={query.sluzba}/><PortalElement as="section" className="client-card client-empty"><PortalElement as="h2">{cs ? 'Aktuálně není otevřený žádný volný termín.' : 'Aktuálne nie je otvorený voľný termín.'}</PortalElement><PortalElement as="p">{cs ? 'Rezervace otevřeme po nastavení dostupnosti a provozních údajů.' : 'Rezervácie otvoríme po nastavení dostupnosti a prevádzkových údajov.'}</PortalElement>{settings.email && <PortalElement as="p"><PortalElement as="a" href={`mailto:${settings.email}`}>{cs ? 'Napiš mi' : 'Napíš mi'}: {settings.email}</PortalElement></PortalElement>}</PortalElement></>}</>;
}
