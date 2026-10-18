import Link from 'next/link';
import { getClientContext } from '@/lib/client-context';
import ClientShell from '@/components/client/ClientShell';
import { PersonalShell } from '@/components/personal/PersonalShell';
import { getBookingSettings } from '@/lib/booking/store';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Chuť na sladké pod kontrolou | Mindbanger', description: 'Pripravovaný online program práce s návykmi a chuťou na sladké.' };
export default async function Page() {
  const [context, { settings }] = await Promise.all([getClientContext(), getBookingSettings()]);
  const content = <article className="client-product-detail"><span className="client-badge">Pripravujeme · Online program</span><h1>Chuť na sladké<br /><em>pod kontrolou.</em></h1><p className="client-lead">Malé kroky k vedomejšiemu vzťahu so sladkým. Vlastným tempom, s pozornosťou k svojim návykom.</p><section className="client-card"><p className="client-eyebrow">NA ČOM PRACUJEME</p><h2>Priestor porozumieť <em>svojim návykom.</em></h2><p>Pripravujeme program zameraný na prácu s pozornosťou, každodennými spúšťačmi a chuťou na sladké. Obsah, formát a konkrétne cvičenia predstavíme po dokončení programu.</p><div className="client-notice">Program zatiaľ nie je v predaji. Cena, lekcie ani termín spustenia nie sú zverejnené. Žiadna platba alebo aktivácia teraz neprebieha.</div><p>Po spustení tu klient s prideleným prístupom nájde svoj program a jeho publikované časti.</p><Link className="client-button" href={context ? '/ucet/produkty' : '/prihlasenie?next=/produkty/chut-na-sladke'}>{context ? 'Späť na moje produkty' : 'Prihlásiť sa do môjho účtu'} ↗</Link></section></article>;
  return context ? <ClientShell name={context.profile?.full_name || 'Môj účet'}>{content}</ClientShell> : <PersonalShell settings={settings}><main id="obsah" className="client-site client-public-product">{content}</main></PersonalShell>;
}
