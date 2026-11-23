import { redirect } from 'next/navigation';
import { bookingAdmin } from '@/lib/booking/admin';
import BookingAdmin from '@/components/admin/BookingAdmin';
import MfaLock from '@/components/admin/AdminDashboard';
export const dynamic = 'force-dynamic';
export default async function AdminBookingsPage({searchParams}:{searchParams:Promise<{day?:string;booking?:string}>}) {
  const query=await searchParams;const initialDay=query.day&&/^\d{4}-\d{2}-\d{2}$/.test(query.day)&&Number.isFinite(Date.parse(query.day))?query.day:undefined;
  if (!(await bookingAdmin(false))) redirect('/mindbanger_daily/admin/login');
  return <MfaLock><BookingAdmin initialDay={initialDay} initialBooking={query.booking&&/^[a-f0-9-]{36}$/i.test(query.booking)?query.booking:undefined} /></MfaLock>;
}
