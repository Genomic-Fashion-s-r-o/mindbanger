import { Appointment, BookingSettings, localDate } from './model';
import { availableSlots } from './availability';
import { COACHING } from './offer';

export type AdminSlot = { startsAt: string; state: 'free' | 'disabled' | 'occupied'; appointmentId?: string };
export const DISABLED_SLOT_LABEL = 'Vypnutý termín';
export function weekDates(first: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(first + 'T12:00:00Z'); day.setUTCDate(day.getUTCDate() + i);
    return day.toISOString().slice(0, 10);
  });
}
export function monday(date: string) {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function calendarSlots(settings: BookingSettings, day: string, bookings: Appointment[], now = new Date()): AdminSlot[] {
  // Admin may assign today's future slots even inside the public booking notice window.
  const cfg = { ...settings, leadHours: 0, horizonDays: 180 };
  const candidates = availableSlots(cfg, COACHING.id, day, [], now);
  const active = bookings.filter(b => !['cancelled', 'expired'].includes(b.status) && !(b.status === 'pending' && b.hold_until && Date.parse(b.hold_until) <= now.getTime()));
  return candidates.map(startsAt => {
    const start = Date.parse(startsAt), end = start + (COACHING.minutes + cfg.bufferMinutes) * 60000;
    const conflict = active.find(b => start < Math.max(Date.parse(b.busy_until), b.kind === 'booking' ? Date.parse(b.ends_at) + 600000 : 0) && end > Date.parse(b.starts_at));
    return { startsAt, state: !conflict ? 'free' : conflict.kind === 'block' && conflict.service_name === DISABLED_SLOT_LABEL && Date.parse(conflict.starts_at) === start ? 'disabled' : 'occupied', appointmentId: conflict?.id };
  });
}
export function bookingOnDay(booking: Appointment, date: string) {
  return localDate(new Date(booking.starts_at)) <= date && localDate(new Date(Date.parse(booking.busy_until) - 1)) >= date;
}
