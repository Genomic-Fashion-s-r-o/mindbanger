import { redirect } from 'next/navigation';
import { bookingAdmin } from '@/lib/booking/admin';
import BookingAdmin from '@/components/admin/BookingAdmin';
import MfaLock from '@/components/admin/AdminDashboard';
export const dynamic = 'force-dynamic';
export default async function AdminBookingsPage() {
  if (!(await bookingAdmin(false))) redirect('/mindbanger_daily/admin/login');
  return <MfaLock><BookingAdmin /></MfaLock>;
}
