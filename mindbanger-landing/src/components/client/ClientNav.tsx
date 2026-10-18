'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const items = [['/ucet', 'Prehľad'], ['/ucet/rezervacie', 'Rezervácie'], ['/ucet/produkty', 'Produkty'], ['/ucet/profil', 'Môj účet']];
export default function ClientNav() {
  const path = usePathname();
  return <nav className="client-nav" aria-label="Klientsky účet">{items.map(([href, label]) => <Link key={href} href={href} aria-current={(href === '/ucet' ? path === href : (path?.startsWith(href) || (href === '/ucet/rezervacie' && path === '/ucet/rezervovat'))) ? 'page' : undefined}>{label}</Link>)}</nav>;
}
