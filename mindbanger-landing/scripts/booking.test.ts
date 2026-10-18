import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { availableSlots } from '../src/lib/booking/availability';
import { DEFAULT_SETTINGS, settingsSchema, TIME_ZONE, LEGAL_VERSION, money } from '../src/lib/booking/model';

const LEGACY_GRID = { ...DEFAULT_SETTINGS, slotMinutes: 15 as const };

test('Configuration cannot enable reservations with incomplete identity or unreviewed prices', () => {
  assert.equal(settingsSchema.safeParse(LEGACY_GRID).success, true);
  assert.equal(settingsSchema.safeParse({ ...LEGACY_GRID, enabled: true }).success, false);
  assert.equal(settingsSchema.safeParse({ ...LEGACY_GRID, hours: LEGACY_GRID.hours.map(h => ({ ...h, day: 0 })) }).success, false);
  assert.ok(money(50.5).includes('50,5'), 'Do not round away agreed cents');
});
test('Availability respects buffers, expired holds, closed days, notice and DST', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  const slots = availableSlots(LEGACY_GRID, 'hypnoticke-sedenie', '2026-10-02', [], now);
  assert.equal(slots[0], '2026-10-02T07:00:00.000Z');
  assert.equal(slots.at(-1), '2026-10-02T13:45:00.000Z');
  const busy = [{ starts_at: slots[0], busy_until: '2026-10-02T08:15:00Z', status: 'confirmed', hold_until: null }];
  assert.equal(availableSlots(LEGACY_GRID, 'hypnoticke-sedenie', '2026-10-02', busy, now)[0], '2026-10-02T08:15:00.000Z');
  assert.equal(availableSlots(LEGACY_GRID, 'hypnoticke-sedenie', '2026-10-02', [{ ...busy[0], status: 'pending', hold_until: '2026-09-30T00:00:00Z' }], now)[0], slots[0]);
  assert.deepEqual(availableSlots(LEGACY_GRID, 'hypnoticke-sedenie', '2026-10-03', [], now), []);
  assert.deepEqual(availableSlots(LEGACY_GRID, 'hypnoticke-sedenie', '2026-02-30', [], now), []);
  const winter = availableSlots(LEGACY_GRID, 'hypnoticke-sedenie', '2026-10-26', [], now);
  assert.equal(winter[0], '2026-10-26T08:00:00.000Z');
  const sunday = { ...LEGACY_GRID, hours: LEGACY_GRID.hours.map(h => ({ ...h, enabled: true, open: '01:00', close: '06:00' })) };
  const transition = availableSlots(sunday, 'hypnoticke-sedenie', '2026-10-25', [], now);
  for (const start of transition) {
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour:'2-digit', minute:'2-digit' });
    const a = hour.format(new Date(start)).split(':').map(Number), b = hour.format(new Date(Date.parse(start) + 75*60000)).split(':').map(Number);
    assert.equal(b[0]*60+b[1]-(a[0]*60+a[1]),75);
  }
});
test('Real PostgreSQL migration: permissions, creation, collisions, idempotency, reschedule, expiry, cancellation and mail queue', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role;');
    await db.exec(readFileSync(new URL('../supabase/migrations/20261007103443_personal_appointments.sql', import.meta.url), 'utf8'));
    const cfg = { ...LEGACY_GRID, enabled: true, legalReviewed: true, pricesApproved: true, provider: 'Test', companyId: '00000000', registration:'Test register', registeredAddress:'Test address', address:'Test meeting room', email:'owner@example.test', phone:'+421000000000', leadHours:1 };
    await db.query('select public.appointment_save_settings($1::jsonb,$2)', [JSON.stringify(cfg),'test-admin']);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.appointments'), /permission denied/);
    await assert.rejects(db.query('select public.appointment_claim_mail(10)'), /permission denied/);
    await db.exec('reset role; set role authenticated');
    await assert.rejects(db.query('select * from public.appointments'), /permission denied/);
    await db.exec('reset role; set role service_role');
    let slots: string[] = [];
    for (let i = 2; !slots.length && i < 10; i++) {
      const day = new Date(Date.now()+i*86400000).toISOString().slice(0,10);
      slots = availableSlots(cfg,'hypnoticke-sedenie',day,[]);
    }
    assert.ok(slots.length > 5);
    const requestId = randomUUID();
    const create = async (start: string, request: string = randomUUID(), hash: string = randomUUID()) => {
      const result = await db.query<{ id: string }>('select public.appointment_create($1,$2,$3,$4,$5,$6,$7,$8,$9) as id', ['hypnoticke-sedenie',start,'Test Client','client@example.test','',hash,request,'https://example.test/rezervacia/sprava#test',LEGAL_VERSION]);
      return result.rows[0].id;
    };
    const id = await create(slots[0],requestId,'first-hash');
    assert.equal(await create(slots[0],requestId,'different-hash'),id);
    await assert.rejects(create(slots[1]), /exclusion constraint/);
    await assert.rejects(db.query('select public.appointment_block($1,$2,$3,$4)', [slots[0],slots[4],'Vacation','test-admin']), /exclusion constraint/);
    await assert.rejects(db.query('select public.appointment_change($1,$2,$3,$4,$5)', [id,'cancel','client',null,'wrong-hash']), /invalid_transition/);
    await db.query('select public.appointment_change($1,$2,$3)', [id,'confirm','test-admin']);
    await assert.rejects(db.query('select public.appointment_change($1,$2,$3)', [id,'complete','test-admin']), /invalid_transition/);
    // Changing the catalogue must not change the agreed duration, price or buffer.
    const changedCfg = { ...cfg, services: cfg.services.map(s => ({...s,minutes:30,price:999})), bufferMinutes:0 };
    await db.query('select public.appointment_save_settings($1::jsonb,$2)', [JSON.stringify(changedCfg),'test-admin']);
    await assert.rejects(db.query('select public.appointment_change($1,$2,$3,$4)', [id,'move','test-admin',new Date(Date.parse(slots.at(-1)!) + 15*60000).toISOString()]), /invalid_slot/);
    await db.query('select public.appointment_change($1,$2,$3,$4)', [id,'move','test-admin',slots[5]]);
    const snapshot = (await db.query<{ price: string; duration: number; buffer: number }>('select price,extract(epoch from (ends_at-starts_at))/60 as duration,extract(epoch from (busy_until-ends_at))/60 as buffer from public.appointments where id=$1',[id])).rows[0];
    assert.equal(Number(snapshot.price),50); assert.equal(Number(snapshot.duration),60); assert.equal(Number(snapshot.buffer),15);
    await db.query('select public.appointment_change($1,$2,$3,$4,$5)', [id,'cancel','client',null,'first-hash']);
    await db.query('select public.appointment_change($1,$2,$3,$4,$5)', [id,'cancel','client',null,'first-hash']);
    await db.query('select public.appointment_save_settings($1::jsonb,$2)', [JSON.stringify(cfg),'test-admin']);
    const second = await create(slots[0]);
    await db.query("update public.appointments set hold_until=now()-interval '1 minute' where id=$1",[second]);
    await create(slots[0]);
    assert.equal((await db.query<{status:string}>('select status from public.appointments where id=$1',[second])).rows[0].status,'expired');
    const firstBatch = await db.query<{id:string}>('select * from public.appointment_claim_mail(20)');
    assert.ok(firstBatch.rows.length >= 6);
    const secondBatch = await db.query<{id:string}>('select * from public.appointment_claim_mail(20)');
    const claimedIds = new Set(firstBatch.rows.map(r=>r.id));
    assert.ok(secondBatch.rows.every(r=>!claimedIds.has(r.id)));
    const granted = await db.query<{ unsafe: string }>("select count(*)::text as unsafe from pg_proc where proname like 'appointment_%' and has_function_privilege('anon',oid,'execute')");
    assert.equal(granted.rows[0].unsafe,'0');
    for (let i=0;i<5;i++) assert.equal((await db.query<{allowed:boolean}>('select public.appointment_rate_limit($1,$2) as allowed',['email-key','ip-key'])).rows[0].allowed,true);
    assert.equal((await db.query<{allowed:boolean}>('select public.appointment_rate_limit($1,$2) as allowed',['email-key','ip-key'])).rows[0].allowed,false);
  } finally { await db.close(); }
});
