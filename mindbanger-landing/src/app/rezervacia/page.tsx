import type { Metadata } from 'next';
import { PersonalShell } from '@/components/personal/PersonalShell';
import BookingForm from '@/components/personal/BookingForm';
import { getBookingSettings } from '@/lib/booking/store';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rezervovať stretnutie | Miroslav Jobus', alternates: { canonical: '/rezervacia' } };
export default async function BookingPage({ searchParams }: { searchParams: Promise<{ sluzba?: string }> }) {
  const [{ settings, installed }, query] = await Promise.all([getBookingSettings(), searchParams]);
  return <PersonalShell settings={settings}><main id="obsah" className="personal-page"><p className="personal-eyebrow">ČAS PRE VÁS</p><h1>Dohodnime si <em>stretnutie.</em></h1><p className="personal-page-intro">Vyberte službu a vhodný termín. Žiadosť je bezplatná a nezáväzná. Dostupnosť zobrazuje miestny čas v Skalici.</p>{settings.enabled && installed ? <BookingForm settings={settings} initialService={query.sluzba} /> : <div className="personal-notice"><h2 style={{ fontSize: 28 }}>Online rezervácie pripravujem.</h2><p>Kalendár otvorím po dokončení prevádzkových podmienok.{settings.email && <> Zatiaľ mi môžete napísať na <a href={`mailto:${settings.email}`}>{settings.email}</a>.</>}</p></div>}</main></PersonalShell>;
}
