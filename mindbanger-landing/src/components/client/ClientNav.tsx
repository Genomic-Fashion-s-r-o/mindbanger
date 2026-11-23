'use client';
import PortalElement from '@/components/client/PortalElement';
import Link from '@/components/client/PortalLink';
import { usePathname } from 'next/navigation';
export default function ClientNav({ locale = 'sk' }: {
    locale?: 'sk' | 'cs' | 'en';
}) {
    const cs = locale === 'cs', prefix = cs ? '/cz' : '', path = (usePathname() || '').replace(/^\/cz(?=\/|$)/, '');
    const items = [['/ucet/karta', cs ? 'Dokumenty a dotazníky' : 'Dokumenty a dotazníky'], ['/ucet', cs ? 'Přehled' : 'Prehľad'], ['/ucet/rezervacie', cs ? 'Rezervace' : 'Rezervácie'], ['/ucet/balicky', cs ? 'Balíčky' : 'Balíčky'], ['/ucet/materialy', 'Moje materiály'], ['/ucet/produkty', cs ? 'Produkty' : 'Produkty'], ['/ucet/profil', cs ? 'Můj účet' : 'Môj účet']];
    return <PortalElement as="nav" className="client-nav" aria-label={cs ? 'Klientský účet' : 'Klientsky účet'}><a href={'/readers/'+locale+'/library'}>{locale==='en'?'Reader club':locale==='cs'?'Čtenářský klub':'Čitateľský klub'}</a>{items.map(([href, label]) => <Link key={href} href={prefix + href} aria-current={(href === '/ucet' ? path === href : (path.startsWith(href) || (href === '/ucet/rezervacie' && path === '/ucet/rezervovat'))) ? 'page' : undefined}>{label}</Link>)}</PortalElement>;
}
