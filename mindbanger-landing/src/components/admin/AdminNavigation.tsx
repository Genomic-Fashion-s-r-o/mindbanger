'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const base = '/mindbanger_daily/admin';
export default function AdminNavigation({ email }: { email: string }) {
  const path = usePathname();
  return <header className="admin-navigation"><a className="admin-skip-link" href="#admin-obsah">Preskočiť na obsah</a><Link className="admin-brand" href={`${base}/rezervacie`}>Mindbanger<span>Administrácia</span></Link><nav aria-label="Hlavná administrácia"><Link href={`${base}/rezervacie`} aria-current={path === `${base}/rezervacie` ? 'page' : undefined}>Kalendár a rezervácie</Link><Link href={`${base}/dashboard`} aria-current={path === `${base}/dashboard` ? 'page' : undefined}>Mindbanger Daily</Link></nav><span className="admin-signed-in">{email}</span></header>;
}
