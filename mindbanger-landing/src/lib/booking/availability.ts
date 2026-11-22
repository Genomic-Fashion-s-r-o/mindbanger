import { BookingSettings, TIME_ZONE } from './model';
import { coversCells, plannedCells } from './planner';
import { slotDuration } from './catalog';

export type BusyInterval = { starts_at: string; busy_until: string; status: string; hold_until: string | null; ends_at?: string; kind?: string };
// Public output contains only times, never appointment IDs, names or contact details.
export function publicSlotAvailability(settings: BookingSettings, serviceId: string, day: string, busy: BusyInterval[], now = new Date()) {
  const slots = availableSlots(settings, serviceId, day, busy, now);
  const reservations = new Set(busy.filter(b => b.kind === 'booking' && ['pending', 'confirmed', 'completed', 'no_show'].includes(b.status)
    && !(b.status === 'pending' && b.hold_until && Date.parse(b.hold_until) <= now.getTime())));
  const free = new Set(slots);
  // Keep closed hours, private blocks and expired holds out of the occupied display.
  const candidates = availableSlots(settings, serviceId, day, busy.filter(b => !reservations.has(b)), now);
  return {slots, occupiedSlots: candidates.filter(start => !free.has(start))};
}
// Iterate real instants instead of parsing a local wall clock. This handles both DST transitions.
export function availableSlots(settings: BookingSettings, serviceId: string, day: string, busy: BusyInterval[], now = new Date()): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const service = settings.services.find(s => s.id === serviceId && s.active);
  if (!service) return [];
  const duration=slotDuration(service,settings.bufferMinutes);
  const midnight = new Date(`${day}T00:00:00Z`).getTime();
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day) return [];
  const weekday = new Date(midnight).getUTCDay();
  const hours = settings.hours.find(h => h.day === weekday && h.enabled);
  const cells = settings.planner ? plannedCells(settings.planner, day) : null;
  if (!cells && !hours) return [];
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const min = now.getTime() + settings.leadHours * 3600000;
  const max = now.getTime() + settings.horizonDays * 86400000;
  const result: string[] = [];
  const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  for (let t = midnight - 3 * 3600000; t < midnight + 26 * 3600000; t += 15 * 60000) {
    if (t < min || t > max) continue;
    const p = Object.fromEntries(parts.formatToParts(new Date(t)).map(x => [x.type, x.value]));
    const date = `${p.year}-${p.month}-${p.day}`;
    const clock = `${p.hour}:${p.minute}`;
    const minute = toMinutes(clock);
    if (date !== day) continue;
    if (cells ? minute % settings.slotMinutes !== 0 || !coversCells(cells, minute,duration)
      : !hours || minute < toMinutes(hours.open) || (minute - toMinutes(hours.open)) % settings.slotMinutes !== 0 || minute + duration > toMinutes(hours.close)) continue;
    const end = t + duration * 60000;
    // A slot may not cross a DST clock change or local date boundary.
    const ep = Object.fromEntries(parts.formatToParts(new Date(end)).map(x => [x.type, x.value]));
    if (`${ep.year}-${ep.month}-${ep.day}` !== day || toMinutes(`${ep.hour}:${ep.minute}`) !== minute + duration) continue;
    if (busy.some(b => ['pending', 'confirmed', 'completed', 'no_show', 'blocked'].includes(b.status) && !(b.status === 'pending' && b.hold_until && Date.parse(b.hold_until) <= now.getTime()) && t < Math.max(Date.parse(b.busy_until),b.kind==='booking'&&b.ends_at?Date.parse(b.ends_at)+((Date.parse(b.ends_at)-Date.parse(b.starts_at)===25*60000)?5:10)*60000:0) && end > Date.parse(b.starts_at))) continue;
    result.push(new Date(t).toISOString());
  }
  return result;
}
