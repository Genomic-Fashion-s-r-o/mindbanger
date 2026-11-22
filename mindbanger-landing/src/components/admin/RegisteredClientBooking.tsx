'use client';
import { useEffect, useRef, useState } from 'react';
import { COACHING_TOPICS } from '@/lib/booking/offer';
import { dateLabel, money,type Service } from '@/lib/booking/model';

type Client = { id: string; name: string | null; email: string; ready: boolean };
type Props = { services:Service[];authorizationMode: boolean; startsAt: string; saving: boolean; error: string; onClose: () => void; onSave: (body: unknown) => Promise<boolean> };
export default function RegisteredClientBooking({ services, startsAt, saving, error, onClose, onSave }: Props) {
  const [serviceId,setServiceId]=useState('individualny-coaching'),[child,setChild]=useState(''),[age,setAge]=useState(0);
  const chosen=services.find(s=>s.id===serviceId);
  const dialog = useRef<HTMLDialogElement>(null), requestId = useRef('');
  const [query, setQuery] = useState(''), [clients, setClients] = useState<Client[]>([]), [client, setClient] = useState<Client | null>(null);
  const [searching, setSearching] = useState(false), [searchError, setSearchError] = useState('');
  const [topic, setTopic] = useState('zatial-neviem'), [note, setNote] = useState(''), [agreed, setAgreed] = useState(false), [review, setReview] = useState(false);
  const topicPrefix=topic==='zatial-neviem'?'':'Téma: '+(COACHING_TOPICS.find(t=>t.id===topic)?.name||'')+'\n';
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('client');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return;const abort=new AbortController();void(async()=>{try{const r=await fetch('/api/admin/coaching-clients?user='+id,{cache:'no-store',signal:abort.signal});const b=await r.json();if(r.ok&&!abort.signal.aborted){setClient({id,name:b.profile.accountName||b.profile.name,email:b.profile.email,ready:true});setQuery(b.profile.email);}}catch{}})();return()=>abort.abort();},[]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true); setSearchError('');
      try {
        const response = await fetch('/api/admin/appointments/clients?q=' + encodeURIComponent(query.trim()), { signal: abort.signal, cache: 'no-store' });
        const result = await response.json(); if (!response.ok) throw new Error(result.error);
        if (!abort.signal.aborted) setClients(result.clients);
      } catch (e) { if (!abort.signal.aborted) setSearchError(e instanceof Error ? e.message : 'Vyhľadanie zlyhalo.'); }
      finally { if (!abort.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query]);
  function changed() { requestId.current = ''; setReview(false); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!client || !agreed || saving) return;
    if (!review) { setReview(true); return; }
    requestId.current ||= crypto.randomUUID();
    const saved = await onSave({ action: 'assign_manual', serviceId,participantName:age?child:'',participantAge:age,guardianConsent:age>0&&agreed,userId: client.id, startsAt, note:topicPrefix+note, price: chosen?.price||0, requestId: requestId.current, agreed: true });
    if (saved) onClose();
  }
  return <dialog ref={dialog} className="admin-assignment" aria-labelledby="assign-heading" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="admin-assignment-heading"><h2 id="assign-heading">Obsadiť termín klientom</h2><button type="button" disabled={saving} aria-label="Zavrieť výber klienta" onClick={onClose}>×</button></div>
    <p className="personal-notice">{dateLabel(startsAt)} · Bratislava<br />{chosen?.name} · {chosen?.minutes} minút stretnutia · {(chosen?.minutes||50)+10} minút rezervovaný čas · {money(chosen?.price||0)}</p><p>Ručne dohodnutá rezervácia bez Stripe. Klient nemusí dokončiť účet ani overovať email. Odkaz na videohovor dostane v potvrdení emailom.</p>
    <form className="personal-form" onSubmit={submit}>
      {!review ? <><label>Služba<select value={serviceId} onChange={e=>{setServiceId(e.target.value);setAge(0);setChild('');changed();}}>{services.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name} · {money(s.price)}</option>)}</select></label>{chosen?.guardian&&<><label>Vek účastníka (0 = dospelý klient; neplnoletý od 13 rokov = jeho dieťa)<input type="number" min="0" max="17" value={age} onChange={e=>{setAge(Number(e.target.value));changed();}}/></label>{age>0&&<label>Meno teenagera<input required minLength={2} maxLength={100} value={child} onChange={e=>{setChild(e.target.value);changed();}}/></label>}<p>Pri neplnoletom vyberte registrovaný účet zákonného zástupcu. Musí výslovne súhlasiť s účasťou.</p></>}
        <label>Nájsť klienta<input autoFocus value={query} maxLength={80} placeholder="Meno alebo email, aspoň 2 znaky" disabled={saving} onChange={e => { setQuery(e.target.value); setClient(null); setClients([]); setSearching(false); setSearchError(''); changed(); }} /></label>
        {searching && <p role="status">Hľadám klientov…</p>}{searchError && <p role="alert">{searchError}</p>}
        {query.trim().length >= 2 && !searching && !client && <div className="admin-client-results" aria-label="Nájdení klienti">{clients.map(c => <button key={c.id} type="button" disabled={saving} onClick={() => { setClient(c); changed(); }}><strong>{c.name || c.email}</strong><span>{c.email}</span></button>)}{!clients.length && !searchError && <p>Žiadny výsledok. Nového klienta pridáš v Kartách klientov alebo cez „+ Rezervovať bez Stripe“ v kalendári.</p>}</div>}
        {client && <div className="admin-selected-client"><strong>{client.name}</strong><span>{client.email}</span><button type="button" onClick={() => { setClient(null); changed(); }}>Vybrať iného klienta</button></div>}
        <label>Téma<select value={topic} disabled={saving} onChange={e => { setTopic(e.target.value);setNote(n=>n.slice(0,400)); changed(); }}>{COACHING_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Stručná poznámka k rezervácii (nepovinné)<textarea value={note} maxLength={400} disabled={saving} onChange={e => { setNote(e.target.value); changed(); }} /></label><small>Poznámka slúži na obsluhu rezervácie. Nevkladajte zdravotné ani citlivé údaje.</small>
        <label className="personal-checkbox"><input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); changed(); }} required /><span>Termín som dohodol s vybraným dospelým klientom, prípadne zákonným zástupcom teenagera. Potvrdil oprávnenie zastupovať uvedené dieťa a výslovný súhlas s účasťou; bol oboznámený s cenou a podmienkami.</span></label>
      </> : <div className="admin-assignment-review"><h3>Skontrolovať rezerváciu</h3><p><strong>{client?.name}</strong><br />{client?.email}</p><p>{COACHING_TOPICS.find(t => t.id === topic)?.name}</p>{note && <p>{note}</p>}<p>Termín sa uloží ako potvrdený bez Stripe. Vytvoríme odkaz na videohovor a odošleme klientovi potvrdenie emailom. Odkaz zostane aj v admin kalendári a karte klienta.</p><p>Klient nemusí overovať email, dokončovať účet ani zadávať kartu. Cena je iba evidencia osobnej dohody; platbu neoznačíme ako prijatú.</p><button type="button" disabled={saving} onClick={() => setReview(false)}>Upraviť údaje</button></div>}
      {error && <p className="personal-notice booking-admin-error" role="alert">{error}</p>}
      <button className="personal-button" disabled={saving || !client || !agreed}>{saving ? 'Ukladám…' : review ? 'Potvrdiť rezerváciu bez Stripe' : 'Skontrolovať pred uložením'}</button>
    </form>
  </dialog>;
}
