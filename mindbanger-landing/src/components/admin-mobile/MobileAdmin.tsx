'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Leaf, LogOut, RefreshCw, Settings, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { bratislavaDay, shiftDay, type MobileOverview } from '@/lib/admin-mobile/model';
import { MobileInterests } from './MobileInterests';

type FirebaseConfig = { projectId: string; applicationId: string; apiKey: string; senderId: string };
type NativeStatus = { id?: string; token?: string; enabled?: boolean; permission?: boolean; error?: string };
type NativeBridge = { postMessage: (value: string) => void; onmessage: ((event: { data: string }) => void) | null };
declare global { interface Window { MindbangerNative?: NativeBridge } }
const clock = (date: string) => new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
const dateLabel = (day: string) => new Intl.DateTimeFormat('sk-SK', { timeZone: 'Europe/Bratislava', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(day + 'T12:00:00Z'));
const statuses: Record<string, string> = { pending: 'Čaká na potvrdenie', confirmed: 'Potvrdené', completed: 'Absolvované', no_show: 'Neprišiel', blocked: 'Blokovaný čas' };

function Brand() { return <div className="ma-brand"><span className="ma-monogram" aria-hidden="true">M</span><div>Mindbanger<span>ADMINISTRÁCIA</span></div></div>; }
async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(response.status === 401 ? 'Prihlásenie vypršalo. Otvor aplikáciu znova a over druhý faktor.' : data.error || 'Spojenie sa nepodarilo. Skús znova.');
  return data;
}

export function MobileAdminLogin() {
  const router = useRouter();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <main className="ma-login"><Brand /><div className="ma-intro"><ShieldCheck size={28} /><h1>Tvoj Mindbanger.<br />Vždy poruke.</h1><p>Prihlás sa svojím administrátorským účtom.</p></div>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      const fields = new FormData(event.currentTarget);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: String(fields.get('email')), password: String(fields.get('password')) });
        if (error) throw Error('Nesprávny email alebo heslo.');
        router.refresh();
      } catch (error) { setError(error instanceof Error ? error.message : 'Prihlásenie sa nepodarilo.'); }
      finally { setBusy(false); }
    }}>
      <label>Email<input name="email" type="email" required autoComplete="username" /></label>
      <label>Heslo<input name="password" type="password" required autoComplete="current-password" /></label>
      {error && <p className="ma-alert" role="alert">{error}</p>}
      <button className="ma-primary" disabled={busy}>{busy ? 'Prihlasujem…' : 'Prihlásiť sa'}</button>
    </form><p className="ma-footnote">Prístup je chránený dvojfaktorovým overením.</p></main>;
}

export function MobileAdmin({ email }: { email: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'calendar' | 'sugar'>('calendar');
  const [day, setDay] = useState(bratislavaDay);
  const [data, setData] = useState<MobileOverview | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [updated, setUpdated] = useState(''), [settingsOpen, setSettingsOpen] = useState(false);
  const [native, setNative] = useState<NativeStatus | null>(null);
  const [firebase, setFirebase] = useState<FirebaseConfig | null>(null), [configured, setConfigured] = useState(false);
  const [bookings, setBookings] = useState(true), [interests, setInterests] = useState(true);
  const [registered, setRegistered] = useState(false), [pushBusy, setPushBusy] = useState(false), [pushMessage, setPushMessage] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const requestId = useRef(0), alive = useRef(true), leaving = useRef(false), bridgeQueue = useRef(Promise.resolve());
  const nativeRef = useRef<NativeStatus | null>(null);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true); setError('');
    try {
      const result = await jsonRequest('/api/admin/mobile/overview?day=' + day);
      if (alive.current && id === requestId.current) { setData(result); setListVersion(value => value + 1); setUpdated(new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })); }
    } catch (error) { if (alive.current && id === requestId.current) { setData(null); setError(error instanceof Error ? error.message : 'Prehľad je nedostupný.'); } }
    finally { if (alive.current && id === requestId.current) setLoading(false); }
  }, [day]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; requestId.current++; }; }, []);
  useEffect(() => { setTab(new URLSearchParams(window.location.search).get('tab') === 'sugar' ? 'sugar' : 'calendar'); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh); window.addEventListener('online', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('online', refresh); };
  }, [load]);

  useEffect(() => {
    const bridge = window.MindbangerNative;
    if (!bridge) return;
    bridge.onmessage = event => {
      bridgeQueue.current = bridgeQueue.current.then(async () => {
        if (leaving.current || !alive.current) return;
        let value: NativeStatus;
        try { value = JSON.parse(event.data); } catch { return; }
        if (value.error) { setPushMessage(value.error); setPushBusy(false); return; }
        if (!value.id) return;
        nativeRef.current = value; setNative(value);
        try {
          const state = await jsonRequest('/api/admin/mobile/device?id=' + encodeURIComponent(value.id));
          if (leaving.current || !alive.current) return;
          setFirebase(state.firebase); setConfigured(state.configured);
          const preferences = state.device || { bookings: true, interests: true };
          setBookings(preferences.bookings); setInterests(preferences.interests);
          if (!value.permission && state.device) {
            await jsonRequest('/api/admin/mobile/device?id=' + value.id, { method: 'DELETE' }); setRegistered(false);
          } else if (value.enabled && value.permission && value.token && state.configured) {
            await jsonRequest('/api/admin/mobile/device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: value.id, token: value.token, ...preferences }) });
            setRegistered(true); setPushMessage('Telefón je pripojený k upozorneniam.');
          } else setRegistered(false);
        } catch (error) { setRegistered(false); setPushMessage(error instanceof Error ? error.message : 'Upozornenia sú nedostupné.'); }
        finally { setPushBusy(false); }
      }).catch(() => { if (alive.current) setPushBusy(false); });
    };
    bridge.postMessage(JSON.stringify({ action: 'status' }));
    return () => { bridge.onmessage = null; };
  }, []);

  async function savePreferences(nextBookings: boolean, nextInterests: boolean) {
    if (!native?.id || !native.token || !registered) return;
    setPushBusy(true); setPushMessage('');
    try {
      await jsonRequest('/api/admin/mobile/device', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: native.id, token: native.token, bookings: nextBookings, interests: nextInterests }) });
      setBookings(nextBookings); setInterests(nextInterests); setPushMessage('Nastavenia sú uložené.');
    } catch (error) { setPushMessage(error instanceof Error ? error.message : 'Nastavenia sa nepodarilo uložiť.'); }
    finally { setPushBusy(false); }
  }
  async function logout() {
    setSigningOut(true); leaving.current = true; setPushMessage('');
    try {
      await bridgeQueue.current;
      const device = nativeRef.current;
      if (device?.id) await jsonRequest('/api/admin/mobile/device?id=' + device.id, { method: 'DELETE' });
      setRegistered(false);
      window.MindbangerNative?.postMessage(JSON.stringify({ action: 'disconnect' }));
      const { error } = await supabase.auth.signOut();
      if (error) throw Error('Odhlásenie sa nepodarilo. Skús znova.');
      setData(null); router.refresh();
    } catch (error) { leaving.current = false; setSigningOut(false); setPushMessage(error instanceof Error ? error.message : 'Odhlásenie sa nepodarilo.'); }
  }
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(day, i - 3));
  const rows = data?.day === day ? data : null;
  return <div className="ma-app">
    <header className="ma-header"><Brand /><button className="ma-icon-button" aria-label="Nastavenia a upozornenia" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings size={22} /></button></header>
    <main>
      {settingsOpen && <section className="ma-settings" aria-label="Nastavenia">
        <h2><Bell size={20} /> Upozornenia</h2>
        {!native ? <p>Upozornenia zapneš v nainštalovanej Android aplikácii.</p> : !configured ? <p>Upozornenia čakajú na pripojenie Firebase. Kalendár a prehľad fungujú samostatne.</p> : <>
          {!registered && <button className="ma-primary" disabled={pushBusy || !firebase} onClick={() => {
            setPushBusy(true); setPushMessage('Pripájam telefón…');
            window.MindbangerNative?.postMessage(JSON.stringify({ action: 'enable', firebase }));
          }}>{pushBusy ? 'Pripájam…' : 'Zapnúť upozornenia'}</button>}
          {registered && <><label className="ma-switch"><span>Nové rezervácie</span><input type="checkbox" checked={bookings} disabled={pushBusy} onChange={e => void savePreferences(e.target.checked, interests)} /></label>
            <label className="ma-switch"><span>Záujem o program</span><input type="checkbox" checked={interests} disabled={pushBusy} onChange={e => void savePreferences(bookings, e.target.checked)} /></label>
            <button className="ma-secondary" disabled={pushBusy} onClick={async () => {
              setPushBusy(true); try { await jsonRequest('/api/admin/mobile/device?id=' + native.id, { method: 'PUT' }); setPushMessage('Skúšobné upozornenie bolo odoslané.'); }
              catch (error) { setPushMessage(error instanceof Error ? error.message : 'Skúška zlyhala.'); } finally { setPushBusy(false); }
            }}>Poslať skúšobné upozornenie</button></>}
        </>}
        {pushMessage && <p className="ma-feedback" role="status">{pushMessage}</p>}
        <p className="ma-email">{email}</p><button className="ma-secondary" disabled={signingOut || pushBusy} onClick={() => void logout()}><LogOut size={17} />{signingOut ? 'Odhlasujem…' : 'Odhlásiť sa'}</button>
      </section>}
      <div className="ma-page-title"><p>TVOJ PREHĽAD</p><h1>{tab === 'calendar' ? 'Kalendár' : 'Nebuď otrokom cukru'}</h1><span>{tab === 'calendar' ? 'Priestor pre tvoje stretnutia.' : 'Každý nový záujem na jednom mieste.'}</span></div>
      <section className="ma-date-panel" aria-label="Výber dátumu"><div className="ma-date-heading"><label><span className="ma-sr-only">Dátum prehľadu</span><input aria-label="Dátum prehľadu" type="date" value={day} onChange={e => { if (e.target.value) setDay(e.target.value); }} /></label><button onClick={() => setDay(bratislavaDay())}>Dnes</button></div>
        <div className="ma-week"><button className="ma-chevron" aria-label="Predchádzajúci týždeň" onClick={() => setDay(shiftDay(day, -7))}><ChevronLeft size={17} /></button>
          {week.map(date => <button key={date} aria-pressed={date === day} aria-label={dateLabel(date)} onClick={() => setDay(date)}><span>{new Intl.DateTimeFormat('sk-SK', { weekday: 'short', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))}</span><strong>{Number(date.slice(-2))}</strong></button>)}
          <button className="ma-chevron" aria-label="Nasledujúci týždeň" onClick={() => setDay(shiftDay(day, 7))}><ChevronRight size={17} /></button></div>
      </section>
      <div className="ma-section-heading"><h2>{dateLabel(day)}</h2><button className="ma-icon-button" disabled={loading} aria-label="Obnoviť údaje" onClick={() => void load()}><RefreshCw size={18} className={loading ? 'ma-spinning' : ''} /></button></div>
      {loading && <p className="ma-loading" role="status">Načítavam aktuálne údaje…</p>}
      {error && <div className="ma-alert" role="alert"><p>{error}</p><button className="ma-secondary" onClick={() => void load()}>Skúsiť znova</button></div>}
      {!loading && rows && (tab === 'calendar' ? <section className="ma-agenda" aria-label="Termíny dňa">
        {rows.bookings.length === 0 ? <div className="ma-empty"><CalendarDays size={34} /><h3>Deň bez rezervácií</h3><p>Na tento deň zatiaľ nie sú naplánované žiadne termíny.</p></div> : rows.bookings.slice(0, 200).map(booking => <article key={booking.id} className="ma-booking"><div className="ma-time"><strong>{clock(booking.starts_at)}</strong><span>{clock(booking.ends_at)}</span></div><div><span className={'ma-status ma-status-' + booking.status}>{statuses[booking.status] || booking.status}</span><h3>{booking.kind === 'block' ? 'Blokovaný čas' : booking.service_name}</h3><p>{booking.customer_name}</p>{booking.kind === 'booking' && <p className="ma-email">{booking.email}</p>}</div></article>)}
        {rows.bookings.length > 200 && <p>Zobrazených prvých 200 termínov. Úplný prehľad je v hlavnej administrácii.</p>}
      </section> : <section aria-label="Záujem o program"><div className="ma-stats"><article><span>{day === bratislavaDay() ? 'DNES' : 'VYBRANÝ DEŇ'}</span><strong>{rows.interestDay}</strong><p>{rows.interestDay === 1 ? 'nový email' : rows.interestDay >= 2 && rows.interestDay <= 4 ? 'nové emaily' : 'nových emailov'}</p></article><article><span>CELKOVO</span><strong>{rows.interestTotal}</strong><p>{rows.interestTotal === 1 ? 'aktívny záujemca' : rows.interestTotal >= 2 && rows.interestTotal <= 4 ? 'aktívni záujemcovia' : 'aktívnych záujemcov'}</p></article></div>
        <p className="ma-count-note">Unikátne aktívne registrácie so súhlasom. Opakované odoslanie emailu nezvyšuje počet.</p>
      </section>)}
      {tab === 'sugar' && !signingOut && <MobileInterests refreshKey={listVersion} />}
      {!loading && rows && <p className="ma-last-update">Aktualizované o {updated} · Čas na Slovensku</p>}
    </main>
    <nav className="ma-tabs" aria-label="Hlavné záložky"><button aria-current={tab === 'calendar' ? 'page' : undefined} onClick={() => setTab('calendar')}><CalendarDays size={22} /><span>Kalendár</span></button><button aria-current={tab === 'sugar' ? 'page' : undefined} onClick={() => setTab('sugar')}><Leaf size={22} /><span>Nebuď otrokom cukru</span></button></nav>
  </div>;
}
