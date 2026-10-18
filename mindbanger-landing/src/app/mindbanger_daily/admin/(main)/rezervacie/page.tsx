import { redirect } from 'next/navigation';
import { bookingAdmin } from '@/lib/booking/admin';
import BookingAdmin from '@/components/admin/BookingAdmin';
export const dynamic = 'force-dynamic';
export default async function AdminBookingsPage() {
  if (!(await bookingAdmin())) redirect('/mindbanger_daily/admin/dashboard');
  return <BookingAdmin />;
}
