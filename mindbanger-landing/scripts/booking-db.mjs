import { Client } from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });
const ref = 'ldjibcxqjbrjsmfppyoi';
if (!process.env.DATABASE_URL || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname !== `${ref}.supabase.co` || new URL(process.env.DATABASE_URL).hostname !== `db.${ref}.supabase.co`) {
  throw new Error('Expected the verified Mindbanger database. Refusing to run against any other target.');
}
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 });
try {
  await client.connect();
  const { rows } = await client.query("select current_database() as database, to_regclass('public.appointment_settings') is not null as installed");
  console.log(JSON.stringify(rows));
  if (process.argv.includes('--verify')) {
    assert.equal(rows[0].installed,true);
    const permissions = await client.query("select relname,relrowsecurity,has_table_privilege('anon',oid,'select') as anon_select,has_table_privilege('authenticated',oid,'select') as client_select from pg_class where relnamespace='public'::regnamespace and (relname like 'appointment_%' or relname='appointments') and relkind='r'");
    assert.equal(permissions.rows.length,5);
    assert.ok(permissions.rows.every(r=>r.relrowsecurity&&!r.anon_select&&!r.client_select));
    const functions = await client.query("select proname,prosecdef,has_function_privilege('anon',oid,'execute') as anon_execute from pg_proc where proname like 'appointment_%' and pronamespace='public'::regnamespace");
    assert.ok(functions.rows.every(r=>!r.prosecdef&&!r.anon_execute));
    const { DEFAULT_SETTINGS, LEGAL_VERSION } = await import('../src/lib/booking/model.ts');
    const cfg = { ...DEFAULT_SETTINGS, enabled:true,legalReviewed:true,pricesApproved:true,provider:'Transaction test',companyId:'00000000',registration:'Test',registeredAddress:'Test',address:'Test',email:'owner@example.test',phone:'Test',leadHours:1,hours:DEFAULT_SETTINGS.hours.map(h=>({...h,enabled:true})) };
    await client.query('BEGIN');
    try {
      await client.query('select public.appointment_save_settings($1::jsonb,$2)',[JSON.stringify(cfg),'transaction-test']);
      const start = (await client.query("select ((now() at time zone 'Europe/Bratislava')::date + 3 + time '09:00') at time zone 'Europe/Bratislava' as start")).rows[0].start;
      const input=['hypnoticke-sedenie',start,'Transaction test','client@example.test','',randomUUID(),randomUUID(),'https://example.test/#test',LEGAL_VERSION];
      const id=(await client.query('select public.appointment_create($1,$2,$3,$4,$5,$6,$7,$8,$9) as id',input)).rows[0].id;
      await client.query('SAVEPOINT collision');
      let rejected=false;
      try { await client.query('select public.appointment_create($1,$2,$3,$4,$5,$6,$7,$8,$9)',[...input.slice(0,5),randomUUID(),randomUUID(),...input.slice(7)]); }
      catch(error) { rejected=error.code==='23P01'; await client.query('ROLLBACK TO SAVEPOINT collision'); }
      assert.equal(rejected,true);
      await client.query('select public.appointment_change($1,$2,$3)',[id,'confirm','transaction-test']);
      await client.query('select public.appointment_change($1,$2,$3,$4,$5)',[id,'cancel','client',null,input[5]]);
      assert.equal((await client.query('select status from public.appointments where id=$1',[id])).rows[0].status,'cancelled');
      console.log('PASS production schema, RLS, RPC grants, creation, conflict and cancellation (transaction rolled back; no email sent).');
    } finally { await client.query('ROLLBACK'); }
    const { createClient }=await import('@supabase/supabase-js');
    const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const result=await service.from('appointment_settings').select('id').eq('id',1).single();
    assert.equal(result.error,null);
    console.log('PASS service-role Data API access.');
  }
  if (process.argv.includes('--apply')) {
    if (rows[0].installed) throw new Error('Scheduling tables already exist; review migration history before reapplying.');
    await client.query('BEGIN');
    try {
      await client.query(readFileSync(new URL('../supabase/migrations/20261007103443_personal_appointments.sql', import.meta.url), 'utf8'));
      await client.query('COMMIT');
      console.log('Scheduling migration applied. Public requests remain disabled.');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} catch (error) {
  // Do not emit connection strings or authentication material.
  console.error('Database operation failed:', error.code || error.name);
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }
