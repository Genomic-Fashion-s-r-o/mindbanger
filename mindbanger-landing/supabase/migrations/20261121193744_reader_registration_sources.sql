-- A book is an attribution source for one Mindbanger identity, not a separate membership.
create table public.reader_sources(
 code text primary key check(code ~ '^[a-z0-9-]{3,60}$'),
 book_key text,book_title text,channel text not null,format text,
 landing_path text not null,active boolean not null default true
);
create table public.reader_account_sources(
 user_id uuid not null references auth.users(id) on delete cascade,
 source_code text not null references public.reader_sources(code),
 first_seen_at timestamptz not null default now(),primary key(user_id,source_code)
);
create index reader_account_source_code_idx on public.reader_account_sources(source_code);
alter table public.reader_preferences add column is_reader boolean not null default false;
alter table public.reader_preferences add column registered_at timestamptz;
alter table public.reader_join_intents add column registration boolean not null default false;
alter table public.reader_join_intents add column source_code text references public.reader_sources(code);
create index reader_intent_source_idx on public.reader_join_intents(source_code);
update public.reader_preferences p set is_reader=true,registered_at=(select min(joined_at) from public.reader_memberships m where m.user_id=p.user_id) where exists(select 1 from public.reader_memberships m where m.user_id=p.user_id and m.status='active');
insert into public.reader_sources(code,book_key,book_title,channel,format,landing_path)values
 ('soul-book-page','soul-that-met-itself','The Soul That Met Itself','book-page',null,'/one_soul-in-two-lives'),
 ('soul-amazon-paperback','soul-that-met-itself','The Soul That Met Itself','amazon','paperback','/one_soul-in-two-lives'),
 ('soul-amazon-kindle','soul-that-met-itself','The Soul That Met Itself','amazon','kindle','/one_soul-in-two-lives'),
 ('soul-bookshop','soul-that-met-itself','The Soul That Met Itself','bookshop',null,'/one_soul-in-two-lives');

alter function public.reader_claim(uuid,text,text) rename to reader_claim_before_sources;
create function public.reader_claim(p_user uuid,p_token_hash text,p_email_hash text)returns uuid language plpgsql set search_path=public,pg_temp as $$
declare r reader_join_intents;s reader_sources;m uuid;was_marketing boolean;
begin
 select * into r from reader_join_intents where token_hash=p_token_hash and email_hash=p_email_hash for update;
 if not found or r.expires_at<=now()or(r.consumed_by is not null and r.consumed_by<>p_user)then raise exception 'reader_invalid_intent';end if;
 -- The original function also protects email ownership binding, expiration and idempotence.
 if r.consumed_by=p_user then return reader_claim_before_sources(p_user,p_token_hash,p_email_hash);end if;
 if r.registration then
  if not exists(select 1 from reader_settings where registrations_enabled)then raise exception 'reader_registration_closed';end if;
  if r.source_code is not null then
   select * into s from reader_sources where code=r.source_code and active;
   if not found then raise exception 'reader_source_unavailable';end if;
  end if;
 end if;
 m=reader_claim_before_sources(p_user,p_token_hash,p_email_hash);
 if r.registration then
  update reader_preferences set registered_at=coalesce(registered_at,now()),is_reader=is_reader or s.book_key is not null,updated_at=now()where user_id=p_user;
  if r.edition_id is null then insert into reader_consent_events(user_id,scope,accepted,version,locale)values(p_user,'account',true,r.terms_version,r.locale);end if;
  if r.source_code is not null then insert into reader_account_sources(user_id,source_code)values(p_user,r.source_code)on conflict do nothing;end if;
  if r.marketing and r.edition_id is null and not exists(select 1 from reader_consent_events where user_id=p_user and scope='marketing'and created_at>=r.created_at)then
   select marketing into was_marketing from reader_preferences where user_id=p_user for update;
   update reader_preferences set marketing=true,updated_at=now()where user_id=p_user and not suppressed;
   if not was_marketing and exists(select 1 from reader_preferences where user_id=p_user and marketing)then insert into reader_consent_events(user_id,scope,accepted,version,locale)values(p_user,'marketing',true,'readers-marketing-2026-11-20',r.locale);end if;
  end if;
 end if;
 return m;
end $$;

create function public.reader_admin_accounts(p_search text default '',p_before timestamptz default 'infinity',p_before_id uuid default 'ffffffff-ffff-ffff-ffff-ffffffffffff')returns jsonb language sql stable set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]')from(
 select p.user_id id,u.email,p.locale,p.marketing,p.is_reader,p.registered_at,
 coalesce((select jsonb_agg(jsonb_build_object('code',s.code,'book',s.book_title,'channel',s.channel,'format',s.format,'at',a.first_seen_at)order by a.first_seen_at)from reader_account_sources a join reader_sources s on s.code=a.source_code where a.user_id=p.user_id),'[]')sources
 from reader_preferences p join auth.users u on u.id=p.user_id where p.registered_at is not null
 and(u.email ilike '%'||replace(replace(p_search,'%','\%'),'_','\_')||'%')and(p.registered_at,p.user_id)<(p_before,p_before_id)
 order by p.registered_at desc,p.user_id desc limit 101)r
$$;

-- Global reader communications include readers registered without a book membership.
create or replace function public.reader_campaign_queue(p_id uuid)returns integer language plpgsql set search_path=public,pg_temp as $$
declare c reader_campaigns;n integer;
begin
 if not exists(select 1 from reader_settings where campaigns_enabled)then raise exception 'reader_campaigns_disabled';end if;
 select * into c from reader_campaigns where id=p_id for update;
 if not found or c.status<>'draft'then raise exception 'reader_campaign_unavailable';end if;
 insert into reader_deliveries(campaign_id,user_id)select c.id,p.user_id from reader_preferences p where p.marketing and not p.suppressed and p.locale=c.locale
 and((c.book_id is null and p.is_reader)or exists(select 1 from reader_memberships m where m.user_id=p.user_id and m.status='active'and(c.book_id is null or m.book_id=c.book_id)))on conflict do nothing;
 get diagnostics n=row_count;update reader_campaigns set status='queued'where id=c.id;return n;
end $$;

-- An offer for all readers does not require joining an individual book.
create or replace function public.member_funnel_quote(p_user uuid,p_program uuid)returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare q jsonb;o reader_offers;
begin
 q=member_funnel_quote_before_readers(p_user,p_program);
 select * into o from reader_offers f where f.program_id=p_program and f.active and f.starts_at<=now()and(f.ends_at is null or f.ends_at>now())
 and((f.book_id is null and exists(select 1 from reader_preferences p where p.user_id=p_user and p.is_reader))or exists(select 1 from reader_memberships m where m.user_id=p_user and m.status='active'and(f.book_id is null or m.book_id=f.book_id)))order by f.price_cents,f.created_at limit 1;
 if found and o.price_cents<(q->>'price')::integer then return jsonb_build_object('price',o.price_cents,'tier','member','deadline',null,'accessId',null,'readerOfferId',o.id,'memberPrice',o.price_cents,'standardPrice',q->>'price');end if;
 return q;
end $$;

alter table public.reader_sources enable row level security;
alter table public.reader_account_sources enable row level security;
revoke all on public.reader_sources,public.reader_account_sources from public,anon,authenticated;
grant all on public.reader_sources,public.reader_account_sources to service_role;
revoke all on function public.reader_claim(uuid,text,text),public.reader_claim_before_sources(uuid,text,text),public.reader_admin_accounts(text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.reader_claim(uuid,text,text),public.reader_claim_before_sources(uuid,text,text),public.reader_admin_accounts(text,timestamptz,uuid) to service_role;
