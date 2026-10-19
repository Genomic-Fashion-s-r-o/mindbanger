import { redirect } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { bookingAdmin } from '@/lib/booking/admin';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await bookingAdmin(false);
  if (!admin) redirect('/mindbanger_daily/admin/login');
  return (
    <div className="admin-workspace">
      <AdminNavigation email={admin.email!} />
      <main className="admin-workspace-content" id="admin-obsah">
        {children}
      </main>
    </div>
  );
}
