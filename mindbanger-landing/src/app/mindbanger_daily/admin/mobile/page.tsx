import type { Metadata } from 'next';
import { bookingAdmin } from '@/lib/booking/admin';
import MfaLock from '@/components/admin/AdminDashboard';
import { MobileAdmin, MobileAdminLogin } from '@/components/admin-mobile/MobileAdmin';
import './mobile.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mindbanger Admin', robots: { index: false, follow: false } };
export default async function MobileAdminPage() {
  const user = await bookingAdmin(false);
  return <div className="mobile-admin-shell">{user ? <MfaLock><MobileAdmin email={user.email!} /></MfaLock> : <MobileAdminLogin />}</div>;
}
