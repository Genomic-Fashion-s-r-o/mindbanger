import type { Metadata } from 'next';
import { PersonalShell } from '@/components/personal/PersonalShell';
import ManageBooking from '@/components/personal/ManageBooking';
import { getBookingSettings } from '@/lib/booking/store';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Správa termínu | Miroslav Jobus', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function ManagePage() {
  const { settings } = await getBookingSettings();
  return <PersonalShell settings={settings}><main id="obsah" className="personal-page"><p className="personal-eyebrow">VÁŠ SÚKROMNÝ ODKAZ</p><h1>Správa <em>termínu.</em></h1><ManageBooking /></main></PersonalShell>;
}
