import Link from 'next/link';
import type { BookingSettings } from '@/lib/booking/model';
import { money } from '@/lib/booking/model';
export function ProgramCard() {
  return <article className="client-program"><div className="client-program-art" aria-hidden="true"><span className="client-orbit" /><span className="client-orbit second" /><span className="client-program-symbol">◒</span><span>MALÉ KROKY. VLASTNÉ TEMPO.</span></div><div className="client-program-body"><span className="client-badge">Pripravujeme</span><h3>Chuť na sladké<br /><em>pod kontrolou.</em></h3><p>Pripravovaný online program pre vedomejšiu prácu s návykmi a každodennou chuťou na sladké.</p><Link className="client-text-link" href="/produkty/chut-na-sladke">Spoznať pripravovaný program <span aria-hidden="true">↗</span></Link></div></article>;
}
export function ServiceCards({ settings, compact = false }: { settings: BookingSettings; compact?: boolean }) {
  const services = settings.services.filter(s => s.active);
  return <div className="client-services">{(compact ? services.slice(0, 3) : services).map((s, i) => <article className="client-card client-service" key={s.id}><div className="client-service-meta"><span>0{i + 1}</span><span>Online · {s.minutes} min</span></div><h3>{s.name}</h3><p>{s.description}</p><div className="client-service-bottom"><strong>{settings.pricesApproved ? money(s.price) : 'Cenník pripravujeme'}</strong><Link href={`/ucet/rezervovat?sluzba=${s.id}`} aria-label={`Podrobnosti o termínoch: ${s.name}`}>Termíny <span aria-hidden="true">↗</span></Link></div></article>)}</div>;
}
export function EmptyAppointment({ enabled = false }: { enabled?: boolean }) {
  return <section className="client-next"><div className="client-calendar-icon" aria-hidden="true">▦</div><div><p className="client-eyebrow">VAŠE NAJBLIŽŠIE STRETNUTIE</p><h2>Váš priestor<br /><em>na chvíľu pre seba.</em></h2><p>Zatiaľ nemáte naplánované stretnutie. Vyberte si z ponuky živých online služieb. {enabled ? 'Voľné termíny nájdete v kalendári.' : 'Novú dostupnosť otvoríme čoskoro.'}</p><Link className="client-button" href="/ucet/rezervovat">Vybrať službu a termín <span aria-hidden="true">↗</span></Link></div><div className="client-next-decoration" aria-hidden="true">◎</div></section>;
}
