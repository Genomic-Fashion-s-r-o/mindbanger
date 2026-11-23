'use client';
import { useEffect, useRef, useState } from 'react';
import { bratislavaInstant, manualBookingSchema } from '@/lib/booking/manual-model';
import { dateLabel, type Service } from '@/lib/booking/model';
import ManualClientForm, { type ManualClientChoice } from './ManualClientForm';
import './manual-booking.css';

export default function ManualBooking({ services, initialStart = '', onSaved, onClose }: { services: Service[]; initialStart?: string; onSaved: (startsAt: string) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), request = useRef('');
  const active = services.filter(s => s.active);
  const [service, setService] = useState(active[0]?.id || ''), [price, setPrice] = useState(active[0]?.price || 0);
  const [query, setQuery] = useState(''), [found, setFound] = useState<ManualClientChoice[]>([]), [client, setClient] = useState<ManualClientChoice | null>(null), [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [review, setReview] = useState<ReturnType<typeof manualBookingSchema.parse> | null>(null);
  const initialWall = initialStart ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(initialStart)).replace(' ', 'T') : '';
  const [lastWall, setLastWall] = useState(initialWall);
  const [age, setAge] = useState(0), [child, setChild] = useState(''), [guardian, setGuardian] = useState(false), [note, setNote] = useState(''), [agreed, setAgreed] = useState(false);
  const chosen = services.find(s => s.id === service);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('client');
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    const abort = new AbortController();
    void (async () => { try { const r = await fetch('/api/admin/coaching-clients?user=' + id, { cache: 'no-store', signal: abort.signal }), b = await r.json(); if (r.ok && !abort.signal.aborted) setClient({ id, name: b.profile.accountName || b.profile.name, email: b.profile.email }); } catch { /* Search remains available. */ } })();
    return () => abort.abort();
  }, []);
  async function search() {
    setBusy(true); setError('');
    try { const r = await fetch('/api/admin/appointments/clients?q=' + encodeURIComponent(query), { cache: 'no-store' }), b = await r.json(); if (!r.ok) throw Error(b.error); setFound(b.clients); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  function prepare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    try {
      request.current ||= crypto.randomUUID();
      const start = String(new FormData(e.currentTarget).get('startsAt') || '');
      setLastWall(start);
      const b = manualBookingSchema.parse({ userId: client?.id, serviceId: service, startsAt: bratislavaInstant(start), requestId: request.current, price, note, agreed, participantName: age ? child : '', participantAge: age, guardianConsent: age > 0 && guardian });
      if (Date.parse(b.startsAt) <= Date.now()) throw Error('Vyber budúci termín.');
      setReview(b);
    } catch (err) { setError(err instanceof Error && !('issues' in err) ? err.message : 'Vyber klienta, službu, čas a potvrď dohodu. Pri teenagerovi doplň údaje a súhlas rodiča.'); }
  }
  async function submit() {
    if (!review || busy) return; setBusy(true); setError('');
    try {
      const r = await fetch('/api/admin/manual-bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) }), b = await r.json();
      if (!r.ok) throw Error(b.error);
      await onSaved(review.startsAt); onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <dialog className="manual-dialog" ref={dialog} aria-labelledby="manual-booking-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <header className="manual-heading"><h2 id="manual-booking-title">Rezervovať bez Stripe</h2><button type="button" aria-label="Zavrieť ručnú rezerváciu" disabled={busy} onClick={onClose}>×</button></header>
    <p>Potvrdený termín dohodnutý individuálne. Nevytvorí sa platba kartou ani doklad o úhrade. Odkaz na videohovor sa uloží do kalendára a príde klientovi aj tebe emailom.</p>
    {!review ? <>
      <section className="manual-client-picker"><h3>1. Klient alebo zákonný zástupca</h3>{client ? <div className="manual-selected"><strong>{client.name}</strong><span>{client.email}</span><button type="button" disabled={busy} onClick={() => { setClient(null); setFound([]); }}>Vybrať iného</button></div> : <><label>Vyhľadať existujúceho klienta<input value={query} maxLength={80} onChange={e => { setQuery(e.target.value); setFound([]); }} /></label><button type="button" disabled={busy || query.trim().length < 2} onClick={() => void search()}>Vyhľadať klienta</button><div className="manual-results">{found.map(c => <button type="button" key={c.id} onClick={() => { setClient(c); setCreate(false); }}><strong>{c.name || c.email}</strong><span>{c.email}</span></button>)}</div><button type="button" disabled={busy} aria-expanded={create} onClick={() => setCreate(v => !v)}>+ Pridať nového klienta</button>{create && <ManualClientForm onCreated={c => { setClient(c); setCreate(false); }} />}</>}</section>
      <form className="manual-form" onSubmit={prepare}><h3>2. Stretnutie</h3><label>Služba<select value={service} onChange={e => { setService(e.target.value); setPrice(services.find(s => s.id === e.target.value)?.price || 0); setAge(0); setChild(''); setGuardian(false); }}>{active.map(s => <option key={s.id} value={s.id}>{s.name} · {s.minutes} minút</option>)}</select></label>
        <label>Dátum a začiatok (Bratislava)<input name="startsAt" type="datetime-local" required step={60} defaultValue={lastWall} /></label><p>Stretnutie {chosen?.minutes || 50} minút + {chosen?.minutes===25?5:10} minút prestávka. Môžeš zvoliť aj čas mimo verejného rozvrhu; obsadené časy sa nedajú prekryť.</p>
        <label>Dohodnutá cena (€) – iba evidencia<input type="number" required min={0} max={10000} step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} /></label><p>0 € znamená bezplatné stretnutie. Úhradu mimo Stripe riešiš individuálne; systém ju neoznačí ako zaplatenú.</p>
        {chosen?.guardian && <><label>Vek účastníka<select value={age} onChange={e => setAge(Number(e.target.value))}><option value={0}>Dospelý klient / rodič</option>{[13, 14, 15, 16, 17].map(a => <option key={a} value={a}>{a} rokov</option>)}</select></label>{age > 0 && <><label>Meno teenagera<input value={child} required minLength={2} maxLength={100} onChange={e => setChild(e.target.value)} /></label><label className="manual-check"><input type="checkbox" checked={guardian} onChange={e => setGuardian(e.target.checked)} required /><span>Vybraný klient je zákonný zástupca. Účasť teenagera je s ním dohodnutá a súhlas potvrdil. Písomný rodičovský súhlas môžem poslať z karty klienta.</span></label></>}</>}
        <label>Organizačná poznámka (nepovinné)<textarea value={note} maxLength={500} onChange={e => setNote(e.target.value)} /></label><small>Nevkladaj zdravotné ani dôverné poznámky; patria do súkromnej karty klienta.</small>
        <label className="manual-check"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required /><span>Termín a prípadnú cenu som dohodol s klientom / zákonným zástupcom. Môžeme mu poslať potvrdenie s odkazom na videohovor na uvedený email.</span></label>
        <button disabled={busy || !client}>Skontrolovať rezerváciu</button>
      </form>
    </> : <section className="manual-review"><h3>Skontroluj pred uložením</h3><p><strong>{client?.name}</strong><br />{client?.email}</p><p>{chosen?.name}<br />{dateLabel(review.startsAt)} · Bratislava<br />{chosen?.minutes} minút stretnutie<br />Dohodnutá cena: {review.price} € · bez Stripe</p>{review.participantAge > 0 && <p>Účastník: {review.participantName}, {review.participantAge} rokov.</p>}<p>Uložením obsadíš termín. Po vytvorení odkazu na videohovor sa automaticky odošle potvrdenie emailom. Klient nemusí dokončovať registráciu ani zadávať kartu.</p><div className="manual-actions"><button disabled={busy} onClick={() => void submit()}>{busy ? 'Ukladám rezerváciu…' : 'Rezervovať a poslať Odkaz na videohovor'}</button><button disabled={busy} onClick={() => { request.current = ''; setReview(null); }}>Upraviť údaje</button></div></section>}
    {error && <p role="alert" className="manual-error">{error}</p>}
  </dialog>;
}
