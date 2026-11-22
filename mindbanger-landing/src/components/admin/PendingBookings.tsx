'use client';
import {topicLabel} from '@/lib/booking/offer';
import { dateLabel, money, type Appointment } from '@/lib/booking/model';
import BookingSourceInfo from './BookingSourceInfo';

export type PendingBooking = Pick<Appointment,'id'|'topic'|'customer_name'|'email'|'phone'|'service_name'|'starts_at'|'price'|'status'|'payment_flow'|'payment_state'|'authorization_expires_at'|'hold_until'|'funding_type'|'participant_name'|'participant_age'|'guardian_consent_at'|'marketingSource'|'marketingSourceUnavailable'|'marketingExcluded'> & {city?:string|null;country?:string|null;billing_unavailable?:boolean};
type Props = { bookings: PendingBooking[]; now: number; loading: boolean; saving: boolean; enabled: boolean; truncated: boolean; onRefresh: () => void; onConfirm: (id: string) => void };
export default function PendingBookings({bookings,now,loading,saving,enabled,truncated,onRefresh,onConfirm}:Props) {
  const rows=bookings.filter(b=>b.payment_state!=='cancelling'&&(b.payment_state==='authorized'||b.payment_state==='capturing'||b.funding_type==='package'||!b.hold_until||Date.parse(b.hold_until)>now));
  const ready=(b:PendingBooking)=>b.funding_type==='package'||b.payment_flow!=='authorize_confirm'||(b.payment_state==='authorized'&&!!b.authorization_expires_at&&Date.parse(b.authorization_expires_at)>now);
  const ordered=[...rows].sort((a,b)=>Number(ready(b))-Number(ready(a))||Date.parse(a.starts_at)-Date.parse(b.starts_at));
  return <section className="admin-pending" aria-labelledby="pending-bookings-title" aria-busy={loading}>
    <header><div><h2 id="pending-bookings-title">Čaká na vaše potvrdenie <span>{rows.length}{truncated?'+':''}</span></h2><p>Rezervácie zo všetkých týždňov. Potvrdením sa zablokovaná suma strhne a klient dostane potvrdenie s odkazom na videohovor.</p></div><button type="button" className="personal-text-link" disabled={loading||saving} onClick={onRefresh}>Obnoviť zoznam</button></header>
    {loading&&!rows.length?<p role="status">Načítavam čakajúce rezervácie…</p>:!rows.length?<p>Žiadne rezervácie nečakajú na potvrdenie.</p>:<div className="admin-pending-list">{ordered.map(b=><article key={b.id}>
      <div>{b.participant_name&&<p><strong>Teenager: {b.participant_name} · {b.participant_age} rokov</strong><br/>Objednávateľ: rodič / zákonný zástupca</p>}<strong>{b.customer_name||'Meno a priezvisko neuvedené'}</strong><p>{dateLabel(b.starts_at)} · {b.service_name}</p>{b.topic&&<p>Téma: <strong>{topicLabel(b.topic)}</strong></p>}<dl className="admin-pending-contact"><div><dt>Email</dt><dd>{b.email?<a href={`mailto:${b.email}`}>{b.email}</a>:'Neuvedený'}</dd></div><div><dt>Telefón</dt><dd>{b.phone?<a href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a>:'Neuvedený'}</dd></div><div><dt>Mesto</dt><dd>{b.billing_unavailable?'Nepodarilo sa načítať':b.city||'Neuvedené'}</dd></div><div><dt>Štát</dt><dd>{b.billing_unavailable?'Nepodarilo sa načítať':b.country==='SK'?'SR':b.country==='CZ'?'ČR':b.country||'Neuvedený'}</dd></div></dl></div>
      <div><strong>{b.funding_type==='package'?'Sedenie z balíčka':money(Number(b.price))}</strong><p>{b.funding_type==='package'?'Uhradené v balíčku':b.payment_state==='authorized'?'Suma zablokovaná na karte':b.payment_state==='capturing'?'Spracúva sa strhnutie platby':'Čaká na zadanie karty klientom'}</p>{b.authorization_expires_at&&<p>Potvrdiť pred {dateLabel(b.authorization_expires_at)}</p>}</div>
      <BookingSourceInfo booking={b}/><button type="button" className="personal-button" disabled={loading||saving||!enabled||!ready(b)} onClick={()=>onConfirm(b.id)}>{b.payment_state==='capturing'?'Platba sa spracúva…':b.funding_type==='package'?'Potvrdiť sedenie z balíčka':b.payment_flow==='authorize_confirm'?`Potvrdiť a strhnúť ${money(Number(b.price))}`:'Potvrdiť a sprístupniť platbu'}</button>
    </article>)}</div>}
    {truncated&&<p role="status">Zobrazuje sa prvých 200 žiadostí podľa termínu. Ďalšie nájdete v kalendári.</p>}
  </section>;
}


