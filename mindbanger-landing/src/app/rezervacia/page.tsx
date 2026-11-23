import PortalElement from '@/components/client/PortalElement';
import TimeRequestCallout from '@/components/booking/TimeRequestCallout';
import './reservation-page.css';
import type { Metadata } from 'next';
import Link from '@/components/client/PortalLink';
import { PersonalShell } from '@/components/personal/PersonalShell';
import { getLocalizedBookingSettings } from '@/lib/booking/store';
import ClientBookingCalendar from '@/components/client/ClientBookingCalendar';
import { resolveBookingTopic } from '@/lib/booking/offer';
import { siteLocale } from '@/lib/site-locale-server';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> { const cs = (await siteLocale()) === 'cs'; return { title: cs ? 'Vybrat termín koučinku | Mindbanger' : 'Vybrať termín coachingu | Mindbanger', description: cs ? 'Individuální online koučink. Cena a délka podle vybrané služby.' : 'Individuálny online coaching pre dospelých. Cena a trvanie podľa vybranej služby.', alternates: { canonical: cs ? '/cz/rezervacia' : '/rezervacia', languages: { sk: '/rezervacia', 'cs-CZ': '/cz/rezervacia', 'x-default': '/rezervacia' } } }; }
export default async function BookingPage({ searchParams }: {
    searchParams: Promise<{
        sluzba?: string;
        tema?: string;
        termin?: string;
        balik?: string;
        kredit?: string;
        dlzka?: string;
    }>;
}) {
    const [{ settings, installed, locale }, query] = await Promise.all([getLocalizedBookingSettings(), searchParams]);
    const topic = resolveBookingTopic(query.tema, query.sluzba);
    const cs = locale === 'cs';
    return <PersonalShell settings={settings}><PortalElement as="main" id="obsah" className="booking-page"><Link className="booking-back-link" href={cs ? '/cz/#cennik' : '/#cennik'}>← {cs ? 'Zpět na nabídku setkání' : 'Späť na ponuku stretnutí'}</Link><PortalElement as="p" className="personal-eyebrow">{cs ? 'INDIVIDUÁLNÍ ONLINE KOUČINK' : 'INDIVIDUÁLNY ONLINE COACHING'}</PortalElement><PortalElement as="h1">{cs ? 'Vyber si svůj' : 'Vyber si svoj'} <PortalElement as="em">{cs ? 'termín.' : 'termín.'}</PortalElement></PortalElement><PortalElement as="p" className="personal-lead">{cs ? 'Nejprve si vyber setkání, potom den a čas. Cenu i svůj výběr uvidíš před dokončením rezervace.' : 'Najprv si vyber stretnutie, potom deň a čas. Cenu aj svoj výber uvidíš pred dokončením rezervácie.'}</PortalElement><PortalElement as="p" className="booking-payment-intro">{cs ? 'Jednorázové setkání bez předplatného. Při rezervaci zadáš kartu přes Stripe a cena objednávky se zablokuje. Po potvrzení termínu se částka strhne a dostaneš odkaz na Zoom.' : 'Jednorazové stretnutie bez predplatného. ' + (settings.paymentMode === 'authorize_confirm' ? 'Pri rezervácii zadáš kartu cez Stripe a zablokuje sa cena objednávky. Po potvrdení termínu sa suma strhne a dostaneš odkaz na Zoom.' : 'Po osobnom potvrdení rezervácie zaplatíš cez Stripe vo svojom účte.')}</PortalElement><PortalElement as="ol" className="booking-page-steps" aria-label={cs ? 'Postup rezervace' : 'Postup rezervácie'}><PortalElement as="li"><PortalElement as="span">1</PortalElement>{cs ? 'Setkání' : 'Stretnutie'}</PortalElement><PortalElement as="li"><PortalElement as="span">2</PortalElement>{cs ? 'Den a čas' : 'Deň a čas'}</PortalElement><PortalElement as="li"><PortalElement as="span">3</PortalElement>{cs ? 'Dokončení v účtu' : 'Dokončenie v účte'}</PortalElement></PortalElement><PortalElement as="div" className="client-site public-booking">{installed && settings.enabled && settings.stripeEnabled ? <ClientBookingCalendar settings={settings} initialService={query.sluzba} initialPackage={query.balik} initialCredit={query.kredit} initialDuration={Number(query.dlzka) || 0} initialTopic={topic} initialStart={query.termin} authenticated={false}/> : <><TimeRequestCallout locale={settings.locale} serviceId={query.sluzba}/><PortalElement as="section" className="client-card"><PortalElement as="h2">{cs ? 'Aktuálně není otevřený žádný volný termín.' : 'Aktuálne nie je otvorený voľný termín.'}</PortalElement><PortalElement as="p">{cs ? 'Cenu a délku najdeš u vybrané služby v ceníku.' : 'Cenu a trvanie nájdeš pri vybranej službe v cenníku.'}</PortalElement></PortalElement></>}</PortalElement></PortalElement></PersonalShell>;
}
