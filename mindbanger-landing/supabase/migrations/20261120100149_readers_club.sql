-- Independent reader memberships. No book, campaign or sale is published by this migration.
create table public.reader_settings(id boolean primary key default true check(id), registrations_enabled boolean not null default true, campaigns_enabled boolean not null default false);
insert into public.reader_settings(id) values(true);
create table public.reader_books(id uuid primary key default gen_random_uuid(),slug text not null unique check(slug~'^[a-z0-9]+(-[a-z0-9]+)*$'),title text not null,author text not null default 'Miroslav Jobus',status text not null default 'draft' check(status in('draft','published','archived')),revision integer not null default 0,created_at timestamptz not null default now());
create table public.reader_editions(id uuid primary key default gen_random_uuid(),book_id uuid not null references public.reader_books(id),slug text not null,locale text not null,title text not null,format text not null check(format in('paperback','hardcover','kindle')),description text not null default '',public_body text not null default '',welcome text not null default '',cover_url text not null default '',isbn_asin text not null default '',status text not null default 'draft' check(status in('draft','published','archived')),club_invitation boolean not null default false,revision integer not null default 0,created_at timestamptz not null default now(),unique(book_id,slug));
create index reader_editions_book_idx on public.reader_editions(book_id);
create table public.reader_entry_links(code text primary key check(code~'^[a-zA-Z0-9_-]{4,40}$'),edition_id uuid not null references public.reader_editions(id),created_at timestamptz not null default now());
create index reader_entry_edition_idx on public.reader_entry_links(edition_id);
create table public.reader_join_intents(id uuid primary key default gen_random_uuid(),token_hash text not null unique,email_hash text not null,edition_id uuid references public.reader_editions(id),locale text not null,marketing boolean not null default false,terms_version text not null,expires_at timestamptz not null default now()+interval '24 hours',consumed_by uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create index reader_intents_expiry_idx on public.reader_join_intents(expires_at);
create index reader_intents_edition_idx on public.reader_join_intents(edition_id);
create index reader_intents_user_idx on public.reader_join_intents(consumed_by);
create table public.reader_memberships(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,book_id uuid not null references public.reader_books(id),status text not null default 'active' check(status in('active','left')),joined_at timestamptz not null default now(),unique(user_id,book_id));
create index reader_memberships_book_idx on public.reader_memberships(book_id,status,joined_at,id);
create table public.reader_membership_editions(membership_id uuid not null references public.reader_memberships(id) on delete cascade,edition_id uuid not null references public.reader_editions(id),created_at timestamptz not null default now(),primary key(membership_id,edition_id));
create index reader_member_edition_idx on public.reader_membership_editions(edition_id);
create table public.reader_preferences(user_id uuid primary key references auth.users(id) on delete cascade,locale text not null default 'en',audio_locale text not null default 'en',marketing boolean not null default false,suppressed boolean not null default false,unsubscribe_token text not null unique default (replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')),updated_at timestamptz not null default now());
create table public.reader_consent_events(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,scope text not null check(scope in('account','marketing')),accepted boolean not null,version text not null,locale text not null,created_at timestamptz not null default now());
create index reader_consent_user_idx on public.reader_consent_events(user_id,created_at desc);
create table public.reader_assets(id uuid primary key default gen_random_uuid(),path text not null unique,name text not null,mime text not null check(mime in('application/pdf','audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','video/mp4','image/jpeg','image/png','image/webp')),size_bytes bigint not null check(size_bytes>0 and size_bytes<=262144000),ready boolean not null default false,created_at timestamptz not null default now());
create table public.reader_materials(id uuid primary key default gen_random_uuid(),book_id uuid not null references public.reader_books(id),edition_id uuid references public.reader_editions(id),locale text not null,title text not null,description text not null default '',asset_id uuid references public.reader_assets(id),visibility text not null default 'members' check(visibility in('public','members')),status text not null default 'draft' check(status in('draft','published','archived')),revision integer not null default 0,published_at timestamptz,created_at timestamptz not null default now());
create index reader_material_book_idx on public.reader_materials(book_id,locale,status);
create index reader_material_edition_idx on public.reader_materials(edition_id);
create index reader_material_asset_idx on public.reader_materials(asset_id);
create table public.reader_audit(id bigint generated always as identity primary key,actor_id uuid references auth.users(id) on delete set null,action text not null,subject_id uuid,created_at timestamptz not null default now());
create index reader_audit_actor_idx on public.reader_audit(actor_id);
create table public.reader_campaigns(id uuid primary key default gen_random_uuid(),book_id uuid references public.reader_books(id),locale text not null,subject text not null,body text not null,status text not null default 'draft' check(status in('draft','queued','paused','complete')),created_at timestamptz not null default now());
create index reader_campaign_book_idx on public.reader_campaigns(book_id);
create table public.reader_deliveries(id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.reader_campaigns(id),user_id uuid not null references auth.users(id) on delete cascade,state text not null default 'queued' check(state in('queued','processing','sent','skipped','failed','review')),claimed_at timestamptz,provider_id text,created_at timestamptz not null default now(),unique(campaign_id,user_id));
create index reader_delivery_queue_idx on public.reader_deliveries(state,created_at);
create index reader_delivery_user_idx on public.reader_deliveries(user_id);
create table public.reader_offers(id uuid primary key default gen_random_uuid(),book_id uuid references public.reader_books(id),program_id uuid not null references public.online_programs(id),price_cents integer not null check(price_cents>0),active boolean not null default false,starts_at timestamptz not null default now(),ends_at timestamptz,created_at timestamptz not null default now(),check(ends_at is null or ends_at>starts_at));
create index reader_offers_program_idx on public.reader_offers(program_id);
create index reader_offers_book_idx on public.reader_offers(book_id);
alter table public.online_program_orders add column reader_offer_id uuid references public.reader_offers(id);
create index online_program_reader_offer_idx on public.online_program_orders(reader_offer_id);

create function public.reader_claim(p_user uuid,p_token_hash text,p_email_hash text) returns uuid language plpgsql set search_path=public,pg_temp as $$
declare r reader_join_intents;e reader_editions;m uuid;was_marketing boolean;
begin
 select * into r from reader_join_intents where token_hash=p_token_hash and email_hash=p_email_hash for update;
 if not found or r.expires_at<=now() or (r.consumed_by is not null and r.consumed_by<>p_user) then raise exception 'reader_invalid_intent';end if;
 if r.consumed_by=p_user then return (select id from reader_memberships where user_id=p_user and book_id=(select book_id from reader_editions where id=r.edition_id));end if;
 if r.edition_id is not null then
  if not exists(select 1 from reader_settings where registrations_enabled) then raise exception 'reader_registration_closed';end if;
  select * into e from reader_editions where id=r.edition_id and status='published' and club_invitation;
  if not found or not exists(select 1 from reader_books where id=e.book_id and status='published')then raise exception 'reader_edition_unavailable';end if;
  insert into reader_memberships(user_id,book_id)values(p_user,e.book_id)on conflict(user_id,book_id)do update set status='active' returning id into m;
  insert into reader_membership_editions(membership_id,edition_id)values(m,e.id)on conflict do nothing;
  insert into reader_consent_events(user_id,scope,accepted,version,locale)values(p_user,'account',true,r.terms_version,r.locale);
 end if;
 insert into reader_preferences(user_id,locale,audio_locale)values(p_user,r.locale,r.locale)on conflict(user_id)do nothing;
 if r.edition_id is not null and r.marketing and not exists(select 1 from reader_consent_events where user_id=p_user and scope='marketing' and created_at>=r.created_at)then
  select marketing into was_marketing from reader_preferences where user_id=p_user for update;
  update reader_preferences set marketing=true,updated_at=now()where user_id=p_user and not suppressed;
  if not was_marketing then insert into reader_consent_events(user_id,scope,accepted,version,locale)values(p_user,'marketing',true,'readers-marketing-2026-11-20',r.locale);end if;
 end if;
 update reader_join_intents set consumed_by=p_user where id=r.id;
 return m;
end $$;

create function public.reader_preferences_save(p_user uuid,p_locale text,p_audio text,p_marketing boolean)returns void language plpgsql set search_path=public,pg_temp as $$
declare old reader_preferences;
begin
 select * into old from reader_preferences where user_id=p_user for update;
 if not found then raise exception 'reader_access_denied';end if;
 if p_marketing and old.suppressed then raise exception 'reader_email_suppressed';end if;
 update reader_preferences set locale=p_locale,audio_locale=p_audio,marketing=p_marketing,updated_at=now()where user_id=p_user;
 insert into reader_consent_events(user_id,scope,accepted,version,locale)values(p_user,'marketing',p_marketing,'readers-marketing-2026-11-20',p_locale);
end $$;

create function public.reader_unsubscribe(p_token text)returns void language plpgsql set search_path=public,pg_temp as $$
declare u reader_preferences;
begin
 select * into u from reader_preferences where unsubscribe_token=p_token for update;
 if found and u.marketing then
  update reader_preferences set marketing=false,updated_at=now()where user_id=u.user_id;
  insert into reader_consent_events(user_id,scope,accepted,version,locale)values(u.user_id,'marketing',false,'readers-marketing-2026-11-20',u.locale);
 end if;
end $$;

create function public.reader_admin_members(p_book uuid default null,p_locale text default null,p_search text default '',p_before timestamptz default 'infinity',p_before_id uuid default 'ffffffff-ffff-ffff-ffff-ffffffffffff')returns jsonb language sql stable set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]')from(select m.id,m.book_id,m.status,m.joined_at,b.title,u.email,p.locale,p.marketing,
 (select jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'locale',e.locale,'format',e.format))from reader_membership_editions me join reader_editions e on e.id=me.edition_id where me.membership_id=m.id)editions
 from reader_memberships m join reader_books b on b.id=m.book_id join auth.users u on u.id=m.user_id join reader_preferences p on p.user_id=m.user_id
 where(p_book is null or m.book_id=p_book)and(p_locale is null or p.locale=p_locale)and(u.email ilike '%'||replace(replace(p_search,'%','\%'),'_','\_')||'%')and(m.joined_at,m.id)<(p_before,p_before_id)
 order by m.joined_at desc,m.id desc limit 101)r
$$;

create function public.reader_campaign_queue(p_id uuid)returns integer language plpgsql set search_path=public,pg_temp as $$
declare c reader_campaigns;n integer;
begin
 if not exists(select 1 from reader_settings where campaigns_enabled)then raise exception 'reader_campaigns_disabled';end if;
 select * into c from reader_campaigns where id=p_id for update;
 if not found or c.status<>'draft'then raise exception 'reader_campaign_unavailable';end if;
 insert into reader_deliveries(campaign_id,user_id)select c.id,p.user_id from reader_preferences p where p.marketing and not p.suppressed and p.locale=c.locale
 and exists(select 1 from reader_memberships m where m.user_id=p.user_id and m.status='active'and(c.book_id is null or m.book_id=c.book_id))on conflict do nothing;
 get diagnostics n=row_count;
 update reader_campaigns set status='queued'where id=c.id;return n;
end $$;
create function public.reader_delivery_claim()returns uuid language plpgsql set search_path=public,pg_temp as $$
declare result uuid;
begin
 -- An uncertain attempt is never automatically retried.
 update reader_deliveries set state='review'where state='processing'and claimed_at<now()-interval '10 minutes';
 select d.id into result from reader_deliveries d join reader_campaigns c on c.id=d.campaign_id where d.state='queued'and c.status='queued'and exists(select 1 from reader_settings where campaigns_enabled)order by d.created_at for update of d skip locked limit 1;
 if result is not null then update reader_deliveries set state='processing',claimed_at=now()where id=result;end if;return result;
end $$;

create function public.reader_email_suppress(p_email text)returns void language plpgsql set search_path=public,pg_temp as $$
begin
 insert into reader_consent_events(user_id,scope,accepted,version,locale)select p.user_id,'marketing',false,'readers-marketing-2026-11-20',p.locale from reader_preferences p join auth.users u on u.id=p.user_id where lower(u.email)=lower(p_email)and p.marketing;
 update reader_preferences set suppressed=true,marketing=false,updated_at=now()where user_id in(select id from auth.users where lower(email)=lower(p_email));
end $$;

alter function public.member_funnel_quote(uuid,uuid) rename to member_funnel_quote_before_readers;
create function public.member_funnel_quote(p_user uuid,p_program uuid)returns jsonb language plpgsql stable set search_path=public,pg_temp as $$
declare q jsonb;o reader_offers;
begin
 q=member_funnel_quote_before_readers(p_user,p_program);
 select * into o from reader_offers f where f.program_id=p_program and f.active and f.starts_at<=now()and(f.ends_at is null or f.ends_at>now())
 and exists(select 1 from reader_memberships m where m.user_id=p_user and m.status='active'and(f.book_id is null or m.book_id=f.book_id))order by f.price_cents,f.created_at limit 1;
 if found and o.price_cents<(q->>'price')::integer then return jsonb_build_object('price',o.price_cents,'tier','member','deadline',null,'accessId',null,'readerOfferId',o.id,'memberPrice',o.price_cents,'standardPrice',q->>'price');end if;
 return q;
end $$;
alter function public.online_program_order_create(uuid,uuid,uuid,boolean)rename to online_program_order_create_before_readers;
create function public.online_program_order_create(p_user uuid,p_program uuid,p_cohort uuid,p_live boolean)returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare result jsonb;q jsonb;
begin
 result=online_program_order_create_before_readers(p_user,p_program,p_cohort,p_live);
 if result->>'stripe_session_id' is null then
  q=member_funnel_quote(p_user,p_program);
  update online_program_orders set reader_offer_id=(q->>'readerOfferId')::uuid where id=(result->>'id')::uuid;
 end if;return result;
end $$;

create function public.reader_address_immutable()returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if tg_table_name='reader_books' then
  if new.slug<>old.slug then raise exception 'reader_address_immutable';end if;
 elsif tg_table_name='reader_editions' then
  if new.book_id<>old.book_id or new.slug<>old.slug or new.locale<>old.locale or new.format<>old.format then raise exception 'reader_address_immutable';end if;
 end if;return new;
end $$;
create trigger reader_book_address before update on reader_books for each row execute function reader_address_immutable();
create trigger reader_edition_address before update on reader_editions for each row execute function reader_address_immutable();
create function public.reader_entry_create()returns trigger language plpgsql set search_path=public,pg_temp as $$
begin insert into reader_entry_links(code,edition_id)values(substr(replace(gen_random_uuid()::text,'-',''),1,18),new.id);return new;end $$;
create trigger reader_edition_entry after insert on reader_editions for each row execute function reader_entry_create();
create or replace function public.member_funnel_catalog(p_user uuid)returns jsonb language sql stable set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('programId',id,'eligible',online_program_prerequisite_met(p_user,id),'quote',member_funnel_quote(p_user,id))),'[]'::jsonb)from online_programs
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('reader-assets','reader-assets',false,262144000,array['application/pdf','audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/ogg','video/mp4','image/jpeg','image/png','image/webp']);
do $$declare t text;f record;begin
 foreach t in array array['reader_settings','reader_books','reader_editions','reader_entry_links','reader_join_intents','reader_memberships','reader_membership_editions','reader_preferences','reader_consent_events','reader_assets','reader_materials','reader_audit','reader_campaigns','reader_deliveries','reader_offers']loop
  execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);
 end loop;
 grant usage,select on sequence reader_consent_events_id_seq,reader_audit_id_seq to service_role;
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and(p.proname like 'reader_%'or p.proname in('member_funnel_quote','member_funnel_quote_before_readers','online_program_order_create','online_program_order_create_before_readers'))loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
