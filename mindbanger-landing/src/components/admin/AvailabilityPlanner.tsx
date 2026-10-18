'use client';
import { useEffect, useState } from 'react';
import { Appointment, BookingSettings, TIME_ZONE, localDate } from '@/lib/booking/model';
import { availableSlots } from '@/lib/booking/availability';
import { AvailabilityPlan, AvailabilityPlanner as Planner, cellTime, plannedCells, plannerSchema } from '@/lib/booking/planner';
import './availability-planner.css';

const DAYS = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
function addDays(day: string, count: number) { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
function toggle(cells: number[], cell: number) { return cells.includes(cell) ? cells.filter(c => c !== cell) : [...cells, cell].sort((a, b) => a - b); }
function Grid({ columns, change, disabled }: { columns: { label: string; cells: number[]; exception?: boolean }[]; change: (column: number, cell: number) => void; disabled: boolean }) {
  return <div className="availability-scroll"><table className="availability-grid"><caption>Pracovné intervaly po 30 minútach. Zelená = otvorený pracovný čas.</caption><thead><tr><th>Čas</th>{columns.map((c, i) => <th key={i}>{c.label}{c.exception && <small>Vlastný deň</small>}</th>)}</tr></thead><tbody>{Array.from({ length: 48 }, (_, cell) => <tr key={cell}><th scope="row">{cellTime(cell)}</th>{columns.map((c, i) => <td key={i}><button type="button" disabled={disabled} aria-label={`${c.label}, ${cellTime(cell)} – ${cellTime(cell + 1)}`} aria-pressed={c.cells.includes(cell)} onClick={() => change(i, cell)}>{c.cells.includes(cell) ? 'Otvorené' : '—'}</button></td>)}</tr>)}</tbody></table></div>;
}
export default function AvailabilityPlanner({ settings, onSaved, onDirtyChange }: { settings: BookingSettings; onSaved: () => Promise<void>; onDirtyChange: (dirty: boolean) => void }) {
  const [draft, setDraft] = useState<Planner>(settings.planner || { plans: [], exceptions: [] });
  const [baseline, setBaseline] = useState<Planner | null>(settings.planner || null);
  const [selected, setSelected] = useState(''), [week, setWeek] = useState(localDate(new Date()));
  const [mode, setMode] = useState<'template' | 'preview'>('template');
  const [service, setService] = useState(settings.services.find(s => s.active)?.id || '');
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<Appointment[]>([]), [loading, setLoading] = useState(false);
  const [now] = useState(() => new Date());
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline || { plans: [], exceptions: [] });
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const response = await fetch(`/api/admin/appointments?day=${week}`, { cache: 'no-store' });
        const result = await response.json(); if (!response.ok) throw new Error(result.error);
        if (active) setBusy(result.bookings);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Náhľad sa nepodarilo načítať.'); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [week]);
  const plan = draft.plans.find(p => p.id === selected);
  function updatePlan(next: AvailabilityPlan) { setDraft(d => ({ ...d, plans: d.plans.map(p => p.id === next.id ? next : p) })); setNotice(''); }
  function addPlan() {
    const p: AvailabilityPlan = { id: crypto.randomUUID(), from: week, to: addDays(week, 27), week: ORDER.map(day => ({ day, cells: [] })) };
    setDraft(d => ({ ...d, plans: [...d.plans, p] })); setSelected(p.id); setMode('template'); setNotice('');
  }
  async function save() {
    const parsed = plannerSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'schedule', planner: parsed.data, expected: baseline }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setBaseline(parsed.data); setDraft(parsed.data); await onSaved(); setNotice('Rozvrh je uložený. Klienti uvidia nové časy, keď budú rezervácie zapnuté.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Uloženie zlyhalo.'); } finally { setSaving(false); }
  }
  const dates = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const previewSettings = { ...settings, planner: draft };
  return <section className="availability-planner"><h2>Plánovanie pracovného času</h2><p>1. Vytvorte týždenný rozvrh a jeho platnosť. 2. Klikaním otvorte pracovné polhodiny. 3. V náhľade upravte konkrétne dni. 4. Uložte zmeny.</p>
    <p className="personal-notice">Vyberáte pracovný čas, nie dĺžku sedenia. Pri 60-minútovej službe a 15-minútovej prestávke musia byť otvorené aspoň tri po sebe idúce polhodiny. Existujúce rezervácie a blokovanie zostávajú zachované. Časové pásmo: Bratislava.</p>
    {!settings.planner && <p>Nový plánovač začne platiť prvým uložením. Nahradí pôvodné pracovné hodiny; mimo rozvrhov a otvorených výnimiek budú časy zatvorené.</p>}
    <div className="booking-admin-toolbar"><button type="button" disabled={saving} aria-pressed={mode === 'template'} onClick={() => setMode('template')}>Týždenné rozvrhy</button><button type="button" disabled={saving} aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Náhľad a jednotlivé dni</button></div>
    {mode === 'template' && <><div className="booking-admin-toolbar"><label>Rozvrh<select value={selected} disabled={saving} onChange={e => setSelected(e.target.value)}><option value="">Vyberte rozvrh</option>{draft.plans.map(p => <option key={p.id} value={p.id}>{p.from} – {p.to}</option>)}</select></label><button type="button" disabled={saving || draft.plans.length >= 24} onClick={addPlan}>Nový týždenný rozvrh</button></div>{plan && <><div className="booking-admin-toolbar"><label>Platnosť od<input type="date" value={plan.from} disabled={saving} onChange={e => updatePlan({ ...plan, from: e.target.value })} /></label><label>Platnosť do (vrátane)<input type="date" value={plan.to} disabled={saving} onChange={e => updatePlan({ ...plan, to: e.target.value })} /></label><button type="button" disabled={saving} onClick={() => { setDraft(d => ({ ...d, plans: d.plans.filter(p => p.id !== plan.id) })); setSelected(''); }}>Odstrániť rozvrh z návrhu</button></div><Grid disabled={saving} columns={ORDER.map(day => ({ label: DAYS[day], cells: plan.week.find(d => d.day === day)?.cells || [] }))} change={(i, cell) => updatePlan({ ...plan, week: plan.week.map(d => d.day === ORDER[i] ? { ...d, cells: toggle(d.cells, cell) } : d) })} /></>}</>}
    {mode === 'preview' && <><div className="booking-admin-toolbar"><button type="button" disabled={saving || loading} onClick={() => setWeek(addDays(week, -7))}>← Týždeň</button><label>Prvý deň<input type="date" value={week} disabled={saving} onChange={e => { if (e.target.value) setWeek(e.target.value); }} /></label><button type="button" disabled={saving || loading} onClick={() => setWeek(addDays(week, 7))}>Týždeň →</button><label>Náhľad pre službu<select value={service} onChange={e => setService(e.target.value)}>{settings.services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.minutes} min)</option>)}</select></label></div><p>Kliknutím na deň vznikne samostatná výnimka, ktorá nahradí celý rozvrh daného dňa. Platí aj mimo obdobia rozvrhu. Zatvorenie pracovného času neruší objednaného klienta.</p><Grid disabled={saving || loading} columns={dates.map(date => ({ label: `${DAYS[new Date(`${date}T12:00Z`).getUTCDay()]} ${date}`, cells: plannedCells(draft, date), exception: draft.exceptions.some(e => e.date === date) }))} change={(i, cell) => { const date = dates[i], cells = toggle(plannedCells(draft, date), cell); setDraft(d => ({ ...d, exceptions: [...d.exceptions.filter(e => e.date !== date), { date, cells }] })); setNotice(''); }} />
      {loading ? <p role="status">Načítavam rezervácie…</p> : <div className="availability-preview">{dates.map(date => { const slots = availableSlots(previewSettings, service, date, busy, now); const items = busy.filter(b => b.status !== 'cancelled' && b.status !== 'expired' && localDate(new Date(b.starts_at)) <= date && localDate(new Date(b.busy_until)) >= date); return <section key={date}><h3>{date.split('-').reverse().join('.')}</h3>{draft.exceptions.some(e => e.date === date) && <button type="button" disabled={saving} onClick={() => setDraft(d => ({ ...d, exceptions: d.exceptions.filter(e => e.date !== date) }))}>Zrušiť výnimku dňa</button>}<p>Rezervovateľné začiatky{dirty ? ' po uložení' : ''}: {slots.length ? slots.map(s => new Intl.DateTimeFormat('sk-SK', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(s))).join(', ') : 'žiadne'}</p>{items.map(b => <p key={b.id}><strong>{b.kind === 'block' ? 'Blokované' : 'Rezervácia'}:</strong> {b.service_name} · {new Intl.DateTimeFormat('sk-SK', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(b.starts_at))}</p>)}</section>; })}</div>}</>}
    {error && <p className="personal-notice booking-admin-error" role="alert">{error}</p>}{notice && <p className="personal-notice" role="status">{notice}</p>}<div className="booking-admin-toolbar"><button type="button" className="personal-button" disabled={saving || (!dirty && !!baseline)} onClick={save}>{saving ? 'Ukladám…' : 'Uložiť plán dostupnosti'}</button><button type="button" disabled={saving || !dirty} onClick={() => { setDraft(baseline || { plans: [], exceptions: [] }); setSelected(''); setError(''); setNotice('Neuložené zmeny sú zahodené.'); }}>Zahodiť neuložené zmeny</button><span role="status">{dirty ? 'Neuložené zmeny' : 'Bez neuložených zmien'}</span></div>
  </section>;
}
