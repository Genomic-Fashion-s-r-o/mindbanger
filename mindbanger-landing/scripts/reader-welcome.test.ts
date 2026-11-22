import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { renderWelcomeEmail, sendWelcomeEmail } from '../src/lib/readers/welcome-email';

test('welcome copy has both formats, preserves emphasis and safely falls back to English', () => {
  const sk = renderWelcomeEmail('sk'), en = renderWelcomeEmail('en');
  assert.equal(sk.subject, 'Vitajte!'); assert.equal(en.subject, 'Welcome — Your Journey Begins Here');
  assert.ok(sk.html.includes('<strong>Miroslav Jobus</strong>')); assert.ok(sk.html.includes('<em>Duša, ktorá stretla samu seba</em>'));
  assert.ok(en.html.includes('<em>The Soul That Met Itself</em>')); assert.ok(en.text.includes("I'm truly happy you've found your way here."));
  assert.ok(!en.text.includes('**')); assert.ok(sk.html.includes('/readers/sk/library')); assert.ok(en.html.includes('/readers/en/preferences'));
  for (const locale of ['de', 'cs', 'ar', '__proto__', '<img src=x onerror=alert(1)>']) { const fallback = renderWelcomeEmail(locale); assert.equal(fallback.language, 'en'); assert.equal(fallback.subject, en.subject); assert.ok(fallback.html.includes('<html lang="en">')); assert.ok(!fallback.html.includes('onerror=')); }
  assert.throws(() => renderWelcomeEmail('en', 'javascript:alert(1)'));
});

test('welcome delivery uses one stable request key and quarantines uncertain outcomes', async () => {
  const input = { deliveryId: randomUUID(), email: 'welcome@example.test', locale: 'sk' };
  let requests = 0;
  const mockFetch: typeof fetch = async (url, init) => { requests++; assert.equal(url, 'https://api.brevo.com/v3/smtp/email'); const payload = JSON.parse(String(init?.body)); assert.equal(payload.headers.idempotencyKey, input.deliveryId); assert.equal(payload.subject, 'Vitajte!'); assert.ok(payload.htmlContent.includes('Miroslav Jobus')); assert.ok(payload.textContent.includes('Vitaj!')); assert.deepEqual(payload.to, [{ email: input.email }]); return Response.json({ messageId: 'mock-message' }, { status: 201 }); };
  const sent = await sendWelcomeEmail(input, { apiKey: 'mock-key', fetch: mockFetch }); assert.equal(sent.state, 'sent'); assert.equal(sent.providerId, 'mock-message'); assert.equal(requests, 1);
  for (const status of [408, 409, 429, 500]) assert.equal((await sendWelcomeEmail(input, { apiKey: 'mock-key', fetch: async () => new Response('', { status }) })).state, 'review');
  assert.equal((await sendWelcomeEmail(input, { apiKey: 'mock-key', fetch: async () => new Response('', { status: 400 }) })).state, 'failed');
  assert.equal((await sendWelcomeEmail(input, { apiKey: 'mock-key', fetch: async () => { throw Error('connection interrupted'); } })).state, 'review');
});

test('PostgreSQL welcomes are private, confirmation-bound, once per reader, and never replay uncertain sends', async () => {
  const db = new PGlite(), reader = randomUUID(), ordinary = randomUUID(), later = randomUUID(), existing = randomUUID(), legacy = randomUUID();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
      grant usage on schema public,auth to anon,authenticated,service_role;create table auth.users(id uuid primary key,email text);
      create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table profiles(id uuid primary key,full_name text,preferred_language text,timezone text);
      create table client_consents(user_id uuid references auth.users(id)on delete cascade,version text,primary key(user_id,version));
      grant all on profiles,client_consents to service_role;grant select on auth.users to service_role;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const file of ['20261102211859_online_programs.sql', '20261102232043_member_funnels.sql', '20261105021753_bonus_password_entry.sql', '20261120100149_readers_club.sql', '20261121193744_reader_registration_sources.sql']) await db.exec(readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
    for (const user of [reader, ordinary, later, existing, legacy]) await db.query('insert into auth.users values($1,$2)', [user, user + '@example.test']);
    await db.query("insert into reader_preferences(user_id,is_reader,registered_at)values($1,true,now())", [existing]);
    await db.exec(readFileSync(new URL('../supabase/migrations/20261122121509_reader_welcome_email.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query<{ n: number }>('select count(*)::int n from reader_welcome_deliveries')).rows[0].n, 0, 'no retrospective emails');
    assert.deepEqual((await db.query("select relrowsecurity rls,has_table_privilege('anon','reader_welcome_deliveries','select')anon,has_function_privilege('authenticated','reader_welcome_claim(uuid)','execute')authenticated from pg_class where oid='reader_welcome_deliveries'::regclass")).rows[0], { rls: true, anon: false, authenticated: false });
    const privileges=(await db.query<{prosecdef:boolean;anon:boolean;authenticated:boolean;service:boolean}>("select prosecdef,has_function_privilege('anon',p.oid,'execute')anon,has_function_privilege('authenticated',p.oid,'execute')authenticated,has_function_privilege('service_role',p.oid,'execute')service from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('reader_claim','reader_claim_before_welcome','reader_welcome_claim')")).rows;assert.equal(privileges.length,3);assert.ok(privileges.every(f=>!f.prosecdef&&!f.anon&&!f.authenticated&&f.service));
    await db.exec('set role service_role');
    async function intent(token: string, user: string, registration: boolean, source: string | null, marketing = false) { await db.query('insert into reader_join_intents(token_hash,email_hash,locale,terms_version,registration,source_code,marketing)values($1,$2,$3,$4,$5,$6,$7)', [token, user, 'sk', 'readers-account-2026-11-20', registration, source, marketing]); }
    await intent('first', reader, true, 'soul-book-page');
    assert.equal((await db.query<{ n: number }>('select count(*)::int n from reader_welcome_deliveries')).rows[0].n, 0, 'no welcome before verification');
    await assert.rejects(db.query("select reader_claim($1,'first','wrong-email')", [reader]), /reader_invalid_intent/);
    await db.query("select reader_claim($1::uuid,'first',$1::text)", [reader]); await db.query("select reader_claim($1::uuid,'first',$1::text)", [reader]);
    assert.equal((await db.query<{ n: number }>('select count(*)::int n from reader_welcome_deliveries where user_id=$1', [reader])).rows[0].n, 1);
    assert.equal((await db.query<{ marketing: boolean }>('select marketing from reader_preferences where user_id=$1', [reader])).rows[0].marketing, false, 'welcome does not opt into marketing');
    await intent('second-source', reader, true, 'soul-amazon-kindle'); await db.query("select reader_claim($1::uuid,'second-source',$1::text)", [reader]);
    await intent('login', ordinary, false, null); await db.query("select reader_claim($1::uuid,'login',$1::text)", [ordinary]);
    await intent('independent', later, true, null); await db.query("select reader_claim($1::uuid,'independent',$1::text)", [later]);
    await intent('already-reader', existing, true, 'soul-book-page'); await db.query("select reader_claim($1::uuid,'already-reader',$1::text)", [existing]);
    assert.equal((await db.query<{ n: number }>('select count(*)::int n from reader_welcome_deliveries')).rows[0].n, 1, 'no duplicate, plain login, unrelated registration or old-reader welcome');
    const claimed = (await db.query<{ d: { id: string; locale: string } }>('select reader_welcome_claim($1)d', [reader])).rows[0].d; assert.ok(claimed.id); assert.equal(claimed.locale, 'sk');
    assert.equal((await db.query<{ d: null }>('select reader_welcome_claim($1)d', [reader])).rows[0].d, null);
    await db.exec("update reader_welcome_deliveries set claimed_at=now()-interval '11 minutes'"); await db.query('select reader_welcome_claim()');
    assert.equal((await db.query<{ state: string }>('select state from reader_welcome_deliveries where user_id=$1', [reader])).rows[0].state, 'review');
    await intent('now-a-reader', later, true, 'soul-book-page'); await db.query("select reader_claim($1::uuid,'now-a-reader',$1::text)", [later]);
    const next = (await db.query<{ d: { user_id: string } }>('select reader_welcome_claim()d')).rows[0].d; assert.equal(next.user_id, later);
    await db.query("update reader_welcome_deliveries set state='sent',sent_at=now()where user_id=$1", [later]); await intent('return-visit', later, true, 'soul-amazon-paperback'); await db.query("select reader_claim($1::uuid,'return-visit',$1::text)", [later]);
    assert.equal((await db.query<{ d: null }>('select reader_welcome_claim()d')).rows[0].d, null, 'sent welcome cannot be claimed again');
    const book=randomUUID(),edition=randomUUID();await db.query("insert into reader_books(id,slug,title,status)values($1,'legacy-book','Legacy book','published')",[book]);await db.query("insert into reader_editions(id,book_id,slug,locale,title,format,status,club_invitation)values($1,$2,'en-paperback','en','Legacy book','paperback','published',true)",[edition,book]);await db.query("insert into reader_join_intents(token_hash,email_hash,edition_id,locale,terms_version)values('legacy-first',$1,$2,'en','readers-account-2026-11-20')",[legacy,edition]);await db.query("select reader_claim($1::uuid,'legacy-first',$1::text)",[legacy]);assert.equal((await db.query<{n:number}>('select count(*)::int n from reader_welcome_deliveries where user_id=$1',[legacy])).rows[0].n,1,'legacy book invitations also receive one welcome');
    await db.exec('reset role'); await db.query('delete from auth.users where id=$1', [later]); assert.equal((await db.query<{ n: number }>('select count(*)::int n from reader_welcome_deliveries where user_id=$1', [later])).rows[0].n, 0);
  } finally { await db.close(); }
});
