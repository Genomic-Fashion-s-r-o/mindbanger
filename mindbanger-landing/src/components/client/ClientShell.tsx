import Link from 'next/link';
import ClientNav from './ClientNav';
import ClientActions from './ClientActions';
export default function ClientShell({ name, children }: { name: string; children: React.ReactNode }) {
  return <div className="client-site"><a className="client-skip" href="#klientsky-obsah">Preskočiť na obsah</a><header className="client-header"><Link className="client-brand" href="/ucet">mindbanger<span>PRIESTOR PRE VÁS</span></Link><ClientNav /><div className="client-identity"><span className="client-avatar" aria-hidden="true">{name.charAt(0).toUpperCase() || 'M'}</span><span>{name}</span></div></header><main id="klientsky-obsah" className="client-main">{children}</main><footer className="client-footer"><div><Link href="/">Mgr. Miroslav Jobus ↗</Link><p>Hypnóza · Coaching · Mentálny tréning</p></div><div className="client-footer-links"><Link href="/podmienky-uctu">Podmienky účtu</Link><Link href="/ochrana-udajov">Ochrana údajov</Link><Link href="/ucet/materialy">Moje materiály</Link></div><ClientActions /></footer></div>;
}
