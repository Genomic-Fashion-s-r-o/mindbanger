'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookingSettings, LEGAL_VERSION, TIME_ZONE, dateLabel, localDate, money } from '@/lib/booking/model';
export default function ClientBookingCalendar({ settings, name, email, initialService }: { settings: BookingSettings; name: string; email: string; initialService?: string }) {
  const [clock] = useState(() => Date.now());
  const services = settings.services.filter(s => s.active);
  const [service, setService] = useState(services.find(s => s.id === initialService)?.id || services[0]?.id || '');
  const [day, setDay] = useState(() => localDate(new Date(clock + settings.leadHours * 3600000)));
  const [month, setMonth] = useState(day.slice(0,7));
  const [slots, setSlots] = useState<string[]>([]), [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false), [refresh, setRefresh] = useState(0);
  const requestId = useRef('');
  const chosen = services.find(s => s.id === service);
  const min = localDate(new Date(clock)), max = localDate(new Date(clock + settings.horizonDays * 86400000));
  const first = new Date(month + '-01T12:00:00Z'), offset = (first.getUTCDay()+6)%7;
  const count = new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  function moveMonth(delta: number) { const d = new Date(first); d.setUTCMonth(d.getUTCMonth()+delta); setMonth(d.toISOString().slice(0,7)); }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);setSlots([]);setSelected('');requestId.current='';
    fetch(`/api/appointments?service=${encodeURIComponent(service)}&day=${day}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);if(!controller.signal.aborted)setSlots(data.slots);}).catch(e=>{if(!controller.signal.aborted)setError(e.message || 'Kalendár sa nepodarilo načítať.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[service,day,refresh]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(sending||!selected)return;setSending(true);setError('');
    const form = new FormData(event.currentTarget);requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:service,startsAt:selected,phone:form.get('phone')||'',adult:form.get('adult')==='on',accepted:form.get('accepted')==='on',requestId:requestId.current,legalVersion:LEGAL_VERSION})});
      const result=await response.json();if(!response.ok){if(response.status===409)setRefresh(x=>x+1);throw new Error(result.error);}
      setDone(true);
    }catch(e){setError(e instanceof Error?e.message:'Rezerváciu sa nepodarilo uložiť.');}finally{setSending(false);}
  }
  if(done)return <section className="client-card client-empty" role="status"><span className="client-badge">Čaká na potvrdenie</span><h2>Váš termín je <em>v účte.</em></h2><p>{chosen?.name} · {dateLabel(selected)}</p><p>Žiadosť je uložená. Termín bude záväzne potvrdený až po osobnom potvrdení administrátorom. Informáciu dostanete aj emailom.</p><p>Teraz sa nič neplatí. Stav rezervácie môžete sledovať vo svojom účte.</p><Link className="client-button" href="/ucet/rezervacie">Moje rezervácie ↗</Link></section>;
  return <form className="client-booking-grid" onSubmit={submit}><div>
    <section className="client-card client-booking-step"><p className="client-eyebrow">01 · VYBERTE SLUŽBU</p><label className="client-field" htmlFor="booking-service">Online služba<select id="booking-service" value={service} disabled={sending} onChange={e=>{setService(e.target.value);setError('');}}>{services.map(s=><option key={s.id} value={s.id}>{s.name} · {s.minutes} min</option>)}</select></label><p>{chosen?.description}</p></section>
    <section className="client-card client-booking-step"><p className="client-eyebrow">02 · VYBERTE TERMÍN</p><div className="client-month-nav"><button type="button" aria-label="Predchádzajúci mesiac" disabled={sending||month<=min.slice(0,7)} onClick={()=>moveMonth(-1)}>←</button><strong>{new Intl.DateTimeFormat('sk-SK',{month:'long',year:'numeric',timeZone:'UTC'}).format(first)}</strong><button type="button" aria-label="Nasledujúci mesiac" disabled={sending||month>=max.slice(0,7)} onClick={()=>moveMonth(1)}>→</button></div><div className="client-calendar-grid">{['Po','Ut','St','Št','Pi','So','Ne'].map(d=><span className="client-weekday" key={d}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={'empty'+i}/>)}{Array.from({length:count},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),weekday=new Date(date+'T12:00:00Z').getUTCDay();return <button key={date} type="button" disabled={sending||date<min||date>max||!settings.hours.some(h=>h.day===weekday&&h.enabled)} aria-label={new Intl.DateTimeFormat('sk-SK',{dateStyle:'full',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'))} aria-pressed={day===date} onClick={()=>{setDay(date);setError('');}}>{i+1}</button>;})}</div><p className="client-calendar-note">Časové pásmo: Europe/Bratislava. Nedostupné dni nie je možné vybrať.</p><fieldset className="client-slot-fieldset" disabled={sending}><legend>Voľné časy · {day.split('-').reverse().join('. ')}</legend>{loading?<p role="status">Načítavam dostupnosť…</p>:<div className="client-slots">{slots.map(s=><button key={s} type="button" aria-pressed={selected===s} onClick={()=>{setSelected(s);setError('');requestId.current='';}}>{new Intl.DateTimeFormat('sk-SK',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit'}).format(new Date(s))}</button>)}</div>}{!loading&&!error&&!slots.length&&<p>V tento deň nie je voľný termín. Vyberte iný dátum.</p>}</fieldset></section>
    <section className="client-card client-booking-step client-form"><p className="client-eyebrow">03 · POTVRĎTE ŽIADOSŤ</p><p>Rezervácia sa uloží do účtu <strong>{name}</strong>. Potvrdenie pošleme na {email}.</p><label htmlFor="booking-phone">Telefón (nepovinný)<input id="booking-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} disabled={sending}/></label><label className="client-check"><input type="checkbox" name="adult" required disabled={sending}/><span>Mám aspoň 18 rokov a žiadam o termín pre seba.</span></label><label className="client-check"><input type="checkbox" name="accepted" required disabled={sending}/><span>Rozumiem nezdravotníckemu charakteru služby a súhlasím s <Link href="/podmienky" target="_blank" rel="noopener noreferrer">podmienkami rezervácie</Link>. Oboznámil/a som sa s <Link href="/ochrana-udajov" target="_blank" rel="noopener noreferrer">ochranou osobných údajov</Link>.</span></label>{error&&<p className="client-error" role="alert">{error} <button className="client-text-link" type="button" onClick={()=>setRefresh(x=>x+1)}>Obnoviť dostupnosť</button></p>}<button className="client-button" disabled={sending||loading||!selected}>{sending?'Ukladám žiadosť…':'Rezervovať bez platby'} ↗</button><small>Žiadosť čaká na osobné potvrdenie. Online platby sú vypnuté.</small></section>
  </div><aside className="client-card client-booking-summary"><span className="client-badge">Živé online stretnutie</span><h2>{chosen?.name}</h2><p>{chosen?.minutes} min{settings.pricesApproved&&chosen&&<> · {money(chosen.price)}</>}</p>{selected?<p><strong>{dateLabel(selected)}</strong></p>:<p>Vyberte si vhodný deň a voľný čas.</p>}<p>{settings.address}</p><div className="client-notice">Teraz sa nič neplatí. Žiadosť ešte nie je potvrdeným termínom.</div><p>Do rezervácie neposielajte zdravotné ani citlivé údaje.</p></aside></form>;
}
