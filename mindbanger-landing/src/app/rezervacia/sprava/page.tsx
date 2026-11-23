import PortalElement from '@/components/client/PortalElement';
import type { Metadata } from 'next';
import { PersonalShell } from '@/components/personal/PersonalShell';
import ManageBooking from '@/components/personal/ManageBooking';
import { getLocalizedBookingSettings } from '@/lib/booking/store';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Správa termínu | Miroslav Jobus', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function ManagePage() {
    const { settings, locale } = await getLocalizedBookingSettings(), cs = locale === 'cs';
    return <PersonalShell settings={settings}><PortalElement as="main" id="obsah" className="personal-page"><PortalElement as="p" className="personal-eyebrow">{cs ? 'VÁŠ SOUKROMÝ ODKAZ' : 'VÁŠ SÚKROMNÝ ODKAZ'}</PortalElement><PortalElement as="h1">{cs ? 'Správa' : 'Správa'} <PortalElement as="em">{cs ? 'termínu.' : 'termínu.'}</PortalElement></PortalElement><ManageBooking locale={locale}/></PortalElement></PersonalShell>;
}
