import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { DEFAULT_SETTINGS, LEGAL_VERSION, clientBookingSchema, BOOKING_PAYMENTS_ENABLED } from '../src/lib/booking/model';
import { availableSlots } from '../src/lib/booking/availability';
test('60-minute services use a configurable 30/15-minute start grid independently of breaks',()=>{
  assert.ok(DEFAULT_SETTINGS.services.every(s=>s.minutes===60));
  const now=new Date('2026-10-01T00:00:00Z');
  const half=availableSlots(DEFAULT_SETTINGS,'hypnoticke-sedenie','2026-10-02',[],now);
  assert.equal(Date.parse(half[1])-Date.parse(half[0]),30*60000);
  const quarter=availableSlots({...DEFAULT_SETTINGS,slotMinutes:15},'hypnoticke-sedenie','2026-10-02',[],now);
  assert.equal(Date.parse(quarter[1])-Date.parse(quarter[0]),15*60000);
  const booked=[{starts_at:half[0],busy_until:new Date(Date.parse(half[0])+75*60000).toISOString(),status:'confirmed',hold_until:null}];
  const after=availableSlots(DEFAULT_SETTINGS,'hypnoticke-sedenie','2026-10-02',booked,now);
  assert.ok(after.every(t=>Date.parse(t)>=Date.parse(half[0])+75*60000));
});
test('Client cannot choose the booking owner, verified email, name or payment state',()=>{
  const value={serviceId:'hypnoticke-sedenie',startsAt:new Date().toISOString(),phone:'',adult:true,accepted:true,requestId:randomUUID(),legalVersion:LEGAL_VERSION};
  assert.ok(clientBookingSchema.safeParse(value).success);
  for(const field of [{user_id:randomUUID()},{email:'other@example.test'},{name:'Other Client'},{paid:true},{price:0}]) assert.equal(clientBookingSchema.safeParse({...value,...field}).success,false);
  assert.equal(BOOKING_PAYMENTS_ENABLED,false);
});
test('Owned bookings: atomic creation, collision prevention, idempotency, admin lifecycle and owner-only cancellation',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create schema auth;create table auth.users(id uuid primary key);');
    await db.exec(readFileSync(new URL('../supabase/migrations/20261007103443_personal_appointments.sql',import.meta.url),'utf8'));
    await db.exec('alter table public.appointments add column user_id uuid references auth.users(id) on delete set null;');
    await db.exec(readFileSync(new URL('../supabase/migrations/20261018202341_client_online_bookings.sql',import.meta.url),'utf8'));
    await db.exec(readFileSync(new URL('../supabase/migrations/20261018204927_configurable_booking_intervals.sql',import.meta.url),'utf8'));
    const a=randomUUID(),b=randomUUID();await db.query('insert into auth.users values($1),($2)',[a,b]);
    const cfg={...DEFAULT_SETTINGS,enabled:true,legalReviewed:true,pricesApproved:true,leadHours:1,provider:'Test',companyId:'00000000',registration:'Test register',registeredAddress:'Test address',email:'owner@example.test',phone:'+421000000000'};
    await db.query('select public.appointment_save_settings($1,$2)',[JSON.stringify(cfg),'test-admin']);
    for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select public.appointment_cancel_for_client($1,$2)',[a,randomUUID()]),/permission denied/);await db.exec('reset role');}
    let slots:string[]=[];
    for(let i=2;i<10&&!slots.length;i++)slots=availableSlots(cfg,'hypnoticke-sedenie',new Date(Date.now()+i*86400000).toISOString().slice(0,10),[]);
    assert.ok(slots.length>6);
    await assert.rejects(db.query('select public.appointment_validate_slot($1,$2,$3)',[JSON.stringify(cfg),'hypnoticke-sedenie',new Date(Date.parse(slots[0])+15*60000).toISOString()]),/invalid_slot/);
    await db.query('select public.appointment_validate_slot($1,$2,$3)',[JSON.stringify({...cfg,slotMinutes:15}),'hypnoticke-sedenie',new Date(Date.parse(slots[0])+15*60000).toISOString()]);
    await db.exec('set role service_role');
    const create=async(user:string,start:string,request=randomUUID())=>(await db.query<{id:string}>('select public.appointment_create_for_client($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) id',[user,'hypnoticke-sedenie',start,'Test Client','client@example.test','','private-hash-'+request,request,'https://example.test/manage',LEGAL_VERSION])).rows[0].id;
    const request=randomUUID(),id=await create(a,slots[0],request);
    assert.equal(await create(a,slots[0],request),id);
    await assert.rejects(create(b,slots[0],request),/request_mismatch/);
    assert.equal((await db.query<{user_id:string,paid:boolean}>('select user_id,paid from public.appointments where id=$1',[id])).rows[0].user_id,a);
    assert.equal((await db.query<{paid:boolean}>('select paid from public.appointments where id=$1',[id])).rows[0].paid,false);
    await assert.rejects(create(b,slots[1]),/exclusion constraint/);
    await assert.rejects(db.query('select public.appointment_cancel_for_client($1,$2)',[b,id]),/booking_not_found/);
    await db.query('select public.appointment_change($1,$2,$3)',[id,'confirm','test-admin']);
    await db.query('select public.appointment_change($1,$2,$3,$4)',[id,'move','test-admin',slots[6]]);
    assert.equal((await db.query<{user_id:string}>('select user_id from public.appointments where id=$1',[id])).rows[0].user_id,a);
    await db.query('select public.appointment_cancel_for_client($1,$2)',[a,id]);
    await db.query('select public.appointment_cancel_for_client($1,$2)',[a,id]);
    assert.equal((await db.query<{status:string}>('select status from public.appointments where id=$1',[id])).rows[0].status,'cancelled');
    await create(b,slots[6]);
    await db.query('select public.appointment_block($1,$2,$3,$4)',[slots[0],slots[5],'Unavailable','test-admin']);
    await assert.rejects(create(a,slots[1]),/exclusion constraint/);
    assert.ok((await db.query('select * from public.appointment_mail')).rows.length>=5,'Lifecycle queues notifications');
  }finally{await db.close();}
});
