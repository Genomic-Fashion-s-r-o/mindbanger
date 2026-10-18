import Link from 'next/link';
import { requireClient, clientAppointments } from '@/lib/client-context';
import { dateLabel, statusLabels, type Appointment } from '@/lib/booking/model';
import CancelAppointment from '@/components/client/CancelAppointment';
export default async function Page() {
 const context=await requireClient(),appointments=await clientAppointments(context.user.id,true);
 // Server snapshot: one timestamp for this dynamic request.
 // eslint-disable-next-line react-hooks/purity
 const now=Date.now();
 const upcoming=appointments.filter(a=>['pending','confirmed'].includes(a.status)&&Date.parse(a.starts_at)>now).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
 const history=appointments.filter(a=>!upcoming.some(b=>b.id===a.id));
 const cards=(rows:typeof appointments)=><div className="client-services">{rows.map(a=><article className="client-card" key={a.id}><span className="client-badge">{statusLabels[a.status as Appointment['status']]}</span><h3>{a.service_name}</h3><p>{dateLabel(a.starts_at)} · Bratislava</p><p>{a.location}</p>{a.status==='pending'&&a.hold_until&&<p>Čaká na potvrdenie do {dateLabel(a.hold_until)}.</p>}{['pending','confirmed'].includes(a.status)&&Date.parse(a.starts_at)>now&&<CancelAppointment id={a.id}/>}</article>)}</div>;
 return <><header className="client-page-heading"><div><p className="client-eyebrow">VÁŠ ČAS PRE SEBA</p><h1>Moje <em>rezervácie.</em></h1><p>Žiadosti, potvrdené stretnutia a história termínov.</p></div><Link className="client-button" href="/ucet/rezervovat">Nová rezervácia ↗</Link></header>{upcoming.length?cards(upcoming):<section className="client-card client-empty"><h2>Zatiaľ tu nemáte žiadny budúci termín.</h2><p>Vyberte si službu a dostupný termín v kalendári. Online platby sú vypnuté.</p><Link className="client-button" href="/ucet/rezervovat">Vybrať službu a termín ↗</Link></section>}{history.length>0&&<section className="client-section"><h2>História <em>rezervácií.</em></h2>{cards(history)}</section>}<p className="client-notice">Termín platí až po osobnom potvrdení. Zmenu času dohodnite cez kontakt prevádzkovateľa; zrušenie budúceho termínu je bezplatné.</p></>;
}
