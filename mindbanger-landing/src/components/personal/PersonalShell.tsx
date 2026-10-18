import Link from 'next/link';
import { BookingSettings } from '@/lib/booking/model';

export function PersonalHeader() {
  return <header className="personal-header"><Link className="personal-brand" href="/">Mgr. Miroslav Jobus<span>HYPNÓZA · MENTÁLNY TRÉNING</span></Link><nav aria-label="Hlavná navigácia"><Link href="/#o-mne">O mne</Link><Link href="/#sluzby">Služby</Link><Link href="/#cennik">Cenník</Link><Link href="/#kontakt">Kontakt</Link><Link className="personal-button small" href="/rezervacia">Rezervovať termín <span aria-hidden="true">↗</span></Link></nav></header>;
}
export function PersonalFooter({ settings }: { settings: BookingSettings }) {
  return <footer className="personal-footer"><div><Link className="personal-brand" href="/">Mgr. Miroslav Jobus<span>PRIESTOR PRE VAŠU POZORNOSŤ.</span></Link><p>Hypnóza, relaxácia a mentálny tréning · Skalica</p>{settings.provider && <p>{settings.provider}{settings.companyId && ` · IČO ${settings.companyId}`}</p>}</div><div className="personal-footer-links"><Link href="/podmienky">Podmienky stretnutí</Link><Link href="/ochrana-udajov">Ochrana osobných údajov</Link><Link href="/cookies">Cookies</Link></div><p className="personal-disclaimer">Poskytované služby majú nezdravotnícky charakter. Nie sú zdravotnou starostlivosťou, psychologickou diagnostikou, psychologickým poradenstvom ani psychoterapiou. Nenahrádzajú odbornú diagnostiku alebo liečbu.</p><small>© {new Date().getFullYear()} Mgr. Miroslav Jobus</small></footer>;
}
export function PersonalShell({ settings, children }: { settings: BookingSettings; children: React.ReactNode }) {
  return <div className="personal-site"><a className="personal-skip" href="#obsah">Preskočiť na obsah</a><PersonalHeader />{children}<PersonalFooter settings={settings} /></div>;
}
