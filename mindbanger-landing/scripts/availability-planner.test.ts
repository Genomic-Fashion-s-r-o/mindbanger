import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { DEFAULT_SETTINGS, BookingSettings, localDate } from '../src/lib/booking/model';
import { availableSlots } from '../src/lib/booking/availability';
import { plannerSchema, plannedCells } from '../src/lib/booking/planner';

test('Dated plans, split workday, whole service and buffer, single-day exceptions, no fallback', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;');
    for (const file of ['20261007103443_personal_appointments.sql', '20261018204927_configurable_booking_intervals.sql', '20261018212637_dated_availability_planner.sql'])
      await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    const now = new Date(), day = localDate(new Date(now.getTime() + 3 * 86400000));
    const plan = { id: randomUUID(), from: day, to: day, week: Array.from({ length: 7 }, (_, day) => ({ day, cells: [18, 19, 20, 24, 25, 26] })) };
    const planner = { plans: [plan], exceptions: [] };
    const cfg: BookingSettings = { ...DEFAULT_SETTINGS, planner, leadHours: 1 };
    assert.ok(plannerSchema.safeParse(planner).success);
    assert.equal(plannerSchema.safeParse({ ...planner, plans: [plan, { ...plan, id: randomUUID() }] }).success, false);
    assert.equal(plannerSchema.safeParse({ ...planner, plans: [{ ...plan, from: '2026-02-30' }] }).success, false);
    assert.equal(availableSlots(cfg, 'hypnoticke-sedenie', day, [], now).length, 2);
    assert.deepEqual(availableSlots({ ...cfg, planner: { ...planner, exceptions: [{ date: day, cells: [] }] } }, 'hypnoticke-sedenie', day, [], now), []);
    assert.deepEqual(plannedCells(planner, '2099-01-01'), []);
    assert.deepEqual(availableSlots({ ...cfg, planner: { plans: [], exceptions: [] } }, 'hypnoticke-sedenie', day, [], now), []);
    const saved = JSON.stringify(planner);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select public.appointment_save_planner($1,$2,$3)', [saved, null, 'test']), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    await db.query('select public.appointment_save_settings($1,$2)', [JSON.stringify(cfg), 'test']);
    await db.query('select public.appointment_save_planner($1,$2,$3)', [saved, null, 'test']);
    await assert.rejects(db.query('select public.appointment_save_planner($1,$2,$3)', [saved, null, 'test']), /schedule_changed/);
    // A general settings form opened before the planner must not erase it.
    await db.query('select public.appointment_save_settings($1,$2)', [JSON.stringify(DEFAULT_SETTINGS), 'test']);
    assert.deepEqual((await db.query<{ config: BookingSettings }>('select config from public.appointment_settings where id=1')).rows[0].config.planner, planner);
    for (const variant of [cfg, { ...cfg, slotMinutes: 15 as const }, { ...cfg, planner: { ...planner, exceptions: [{ date: day, cells: [] }] } }, { ...cfg, planner: { plans: [], exceptions: [{ date: day, cells: [30, 31, 32, 33] }] } }]) {
      const slots = availableSlots(variant, 'hypnoticke-sedenie', day, [], now);
      const midnight = Date.parse(`${day}T00:00:00Z`);
      for (let t = midnight - 3 * 3600000; t < midnight + 26 * 3600000; t += 15 * 60000) {
        if (localDate(new Date(t)) !== day) continue;
        const start = new Date(t).toISOString();
        if (slots.includes(start)) await db.query('select public.appointment_validate_slot($1,$2,$3)', [JSON.stringify(variant), 'hypnoticke-sedenie', start]);
        else await assert.rejects(db.query('select public.appointment_validate_slot($1,$2,$3)', [JSON.stringify(variant), 'hypnoticke-sedenie', start]), /invalid_slot/);
      }
    }
    const first = availableSlots(cfg, 'hypnoticke-sedenie', day, [], now)[0];
    assert.equal(availableSlots(cfg, 'hypnoticke-sedenie', day, [{ starts_at: first, busy_until: new Date(Date.parse(first) + 75 * 60000).toISOString(), status: 'confirmed', hold_until: null }], now).length, 1);
  } finally { await db.close(); }
});
