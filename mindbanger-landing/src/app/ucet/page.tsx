import Link from 'next/link';
import { requireClient, clientAppointments } from '@/lib/client-context';
import { getBookingSettings } from '@/lib/booking/store';
import { dateLabel, statusLabels, type Appointment } from '@/lib/booking/model';
import { EmptyAppointment, ProgramCard, ServiceCards } from '@/components/client/ClientCards';
export default async function Page() {
  const context = await requireClient();
  const [{ settings }, appointments] = await Promise.all([getBookingSettings(), clientAppointments(context.user.id)]);
  const next = appointments[0], name = context.profile?.full_name?.split(' ')[0] || '';
  return <><header className="client-page-heading"><div><p className="client-eyebrow">VÁŠ KLIENTSKY ÚČET</p><h1>{name ? `Vitajte, ${name}.` : 'Vitajte v Mindbanger.'}</h1><p>Vaše stretnutia, malé kroky a priestor pre seba.</p></div><span className="client-badge">Bezplatný klientsky účet</span></header>{next ? <section className="client-next"><div><p className="client-eyebrow">VAŠE NAJBLIŽŠIE STRETNUTIE</p><h2>{next.service_name}</h2><p>{dateLabel(next.starts_at)} · Europe/Bratislava</p><span className="client-badge">{statusLabels[next.status as Appointment['status']]}</span><Link href="/ucet/rezervacie" className="client-button">Moje rezervácie ↗</Link></div></section> : <EmptyAppointment enabled={settings.enabled} />}<section className="client-section"><div className="client-section-heading"><div><p className="client-eyebrow">STRETNIME SA ONLINE</p><h2>Čas venovaný <em>vám.</em></h2><p>Individuálny prístup, vaše tempo a spoločný zámer.</p></div><Link className="client-text-link" href="/ucet/sluzby">Všetky online služby ↗</Link></div><ServiceCards settings={settings} compact /></section><section className="client-section"><div className="client-section-heading"><div><p className="client-eyebrow">ONLINE PROGRAMY</p><h2>Priestor pre nové <em>návyky.</em></h2></div><Link className="client-text-link" href="/ucet/produkty">Moje produkty ↗</Link></div><ProgramCard /></section></>;
}
