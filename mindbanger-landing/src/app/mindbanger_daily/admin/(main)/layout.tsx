import { redirect } from 'next/navigation';
import Link from 'next/link';
import { bookingAdmin } from '@/lib/booking/admin';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await bookingAdmin(false);
  if (!admin) redirect('/mindbanger_daily/admin/login');
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500/30">
      <nav className="border-b border-white/5 bg-slate-900/50 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-5"><Link href="/mindbanger_daily/admin/dashboard" className="font-serif font-bold text-amber-500">Mindbanger Admin</Link><Link href="/mindbanger_daily/admin/rezervacie" className="text-sm text-amber-200 hover:text-white">Kalendár a rezervácie</Link></div>
          <span className="text-sm text-slate-400">{admin.email}</span>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
