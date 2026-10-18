'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookingSettings, LEGAL_VERSION, TIME_ZONE, localDate, money, dateLabel } from '@/lib/booking/model';

export default function BookingForm({ settings, initialService, admin = false, onCreated }: { settings: BookingSettings; initialService?: string; admin?: boolean; onCreated?: () => void }) {
  const services = settings.services.filter(s => s.active);
  const [service, setService] = useState(services.find(s => s.id === initialService)?.id || services[0]?.id || '');
  const [day, setDay] = useState(localDate(new Date(Date.now() + settings.leadHours * 3600000)));
  const [slots, setSlots] = useState<string[]>([]), [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false), [sending, setSending] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requestId = useRef('');
  const chosen = services.find(s => s.id === service);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setSlots([]); setSelected(''); setError(''); requestId.current = '';
    fetch(`/api/appointments?service=${encodeURIComponent(service)}&day=${day}`, { signal: controller.signal, cache: 'no-store' }).then(async r => { const result = await r.json(); if (!r.ok) throw new Error(result.error); setSlots(result.slots); }).catch(e => { if (e.name !== 'AbortError') setError(e.message || 'Kalendár sa nepodarilo načítať.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [service, day, refresh]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (sending || !selected) return;
    const form = new FormData(event.currentTarget);
    setSending(true); setError('');
    requestId.current ||= crypto.randomUUID();
    const booking = { serviceId: service, startsAt: selected, name: form.get('name'), email: form.get('email'), phone: form.get('phone') || '', adult: form.get('adult') === 'on', accepted: form.get('accepted') === 'on', website: form.get('website') || '', requestId: requestId.current, legalVersion: LEGAL_VERSION };
    try {
      const response = await fetch(admin ? '/api/admin/appointments' : '/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(admin ? { action: 'create', booking } : booking) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) setRefresh(x => x + 1); throw new Error(result.error); }
      setSuccess(result.message || 'Žiadosť je uložená. Termín môžete potvrdiť v prehľade rezervácií.');
      onCreated?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Žiadosť sa nepodarilo odoslať.'); }
    finally { setSending(false); }
  }
  if (success) return <div className="personal-form"><div className="personal-success" role="status"><h2>Ďakujem za vašu dôveru.</h2><p>{success}</p><p>Ak email nenájdete, skontrolujte spam. Pri nedoručení kontaktujte prevádzkovateľa; neposielajte tú istú žiadosť znova.</p></div><Link href={admin ? '/mindbanger_daily/admin/rezervacie' : '/'} className="personal-text-link">{admin ? 'Späť do kalendára' : 'Späť na úvod'}</Link></div>;
  return <div className="personal-form-columns"><form className="personal-form" onSubmit={submit}>
    <label>Služba<select value={service} onChange={e => setService(e.target.value)} disabled={sending}>{services.map(s => <option key={s.id} value={s.id}>{s.name} · {s.minutes} min · {money(s.price)}</option>)}</select></label>
    <label>Dátum<input type="date" value={day} onChange={e => setDay(e.target.value)} min={localDate(new Date())} max={localDate(new Date(Date.now() + settings.horizonDays * 86400000))} required disabled={sending} /></label>
    <fieldset disabled={sending}><legend>Dostupné začiatky · čas v Bratislave</legend>{loading ? <p role="status">Načítavam dostupnosť…</p> : <div className="personal-slots">{slots.map(s => <button key={s} type="button" className="personal-slot" aria-pressed={selected === s} onClick={() => { setSelected(s); requestId.current = ''; }}>{new Intl.DateTimeFormat('sk-SK', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(s))}</button>)}</div>}{!loading && !error && !slots.length && <p>V tento deň nie je voľný termín. Vyberte iný dátum.</p>}</fieldset>
    <label>Meno a priezvisko<input name="name" autoComplete="name" required minLength={2} maxLength={100} disabled={sending} /></label>
    <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={sending} /></label>
    <label>Telefón <span>(nepovinný)</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} disabled={sending} /></label>
    <div className="personal-honeypot" aria-hidden="true"><label>Web<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="personal-checkbox"><input type="checkbox" name="adult" required disabled={sending} /><span>{admin ? 'Klient potvrdil plnoletosť.' : 'Mám aspoň 18 rokov a žiadam o termín pre seba.'}</span></label>
    <label className="personal-checkbox"><input type="checkbox" name="accepted" required disabled={sending} /><span>{admin ? 'Klient bol oboznámený s podmienkami a nezdravotníckym rozsahom služby.' : <>Rozumiem nezdravotníckemu charakteru služby a súhlasím s <Link href="/podmienky" target="_blank">podmienkami rezervácie</Link>. Bol/a som oboznámený/á s <Link href="/ochrana-udajov" target="_blank">ochranou osobných údajov</Link>.</>}</span></label>
    {error && <div className="personal-error" role="alert">{error}<button className="personal-text-link" type="button" onClick={() => setRefresh(x => x + 1)} style={{ marginLeft: 12 }}>Obnoviť kalendár</button></div>}
    <button className="personal-button" disabled={sending || loading || !selected} type="submit">{sending ? 'Ukladám žiadosť…' : admin ? 'Pridať žiadosť klienta' : 'Odoslať bezplatnú žiadosť'} <span aria-hidden="true">↗</span></button><p style={{ fontSize: 12 }}>Odoslaním nevzniká povinnosť platiť. Termín platí až po osobnom potvrdení. Zmluvu o službe a úhradu dohodneme osobne.</p>
  </form><aside className="personal-booking-aside"><p className="personal-eyebrow">VAŠE STRETNUTIE</p><h2>{chosen?.name}</h2><p>{chosen?.description}</p><p>{chosen?.minutes} min · {chosen && money(chosen.price)}</p>{selected && <p><strong>{dateLabel(selected)}</strong></p>}<p>{settings.address}</p><hr /><p style={{ marginTop: 20 }}>Medzi sedeniami nechávam priestor na pokojný príchod a prípravu. Prosím, do rezervácie neposielajte zdravotné ani citlivé údaje.</p><p>Otázky? <a href={`mailto:${settings.email}`}>{settings.email}</a></p></aside></div>;
}
