-- One operational welcome per reader identity, queued only after a verified claim.
-- Existing readers are not backfilled or emailed by this migration.
create table public.reader_welcome_deliveries(
 id uuid not null unique default gen_random_uuid(),
 user_id uuid primary key references auth.users(id)on delete cascade,
 locale text not null,state text not null default 'queued'check(state in('queued','processing','sent','skipped','failed','review')),
 claimed_at timestamptz,sent_at timestamptz,provider_id text,content_locale text,content_version text,
 created_at timestamptz not null default now()
);
create index reader_welcome_queue_idx on public.reader_welcome_deliveries(state,created_at);
alter table public.reader_welcome_deliveries enable row level security;
revoke all on public.reader_welcome_deliveries from public,anon,authenticated;
grant all on public.reader_welcome_deliveries to service_role;

alter function public.reader_claim(uuid,text,text)rename to reader_claim_before_welcome;
create function public.reader_claim(p_user uuid,p_token_hash text,p_email_hash text)returns uuid language plpgsql set search_path=public,pg_temp as $$
declare r reader_join_intents;m uuid;was_reader boolean;eligible boolean;
begin
 select * into r from reader_join_intents where token_hash=p_token_hash and email_hash=p_email_hash for update;
 if not found or r.expires_at<=now()or(r.consumed_by is not null and r.consumed_by<>p_user)then raise exception 'reader_invalid_intent';end if;
 select exists(select 1 from reader_preferences where user_id=p_user and is_reader)or exists(select 1 from reader_memberships where user_id=p_user and status='active')into was_reader;
 eligible=r.edition_id is not null or(r.registration and exists(select 1 from reader_sources where code=r.source_code and book_key is not null and active));
 m=reader_claim_before_welcome(p_user,p_token_hash,p_email_hash);
 if eligible then
  update reader_preferences set is_reader=true,registered_at=coalesce(registered_at,now())where user_id=p_user;
  if not was_reader and r.consumed_by is null then
   insert into reader_welcome_deliveries(user_id,locale)values(p_user,r.locale)on conflict(user_id)do nothing;
  end if;
 end if;
 return m;
end $$;

create function public.reader_welcome_claim(p_user uuid default null)returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare d reader_welcome_deliveries;
begin
 -- An uncertain attempt is held for review, never automatically sent again.
 update reader_welcome_deliveries set state='review'where state='processing'and claimed_at<now()-interval '10 minutes';
 select * into d from reader_welcome_deliveries where state='queued'and(p_user is null or user_id=p_user)order by created_at for update skip locked limit 1;
 if not found then return null;end if;
 update reader_welcome_deliveries set state='processing',claimed_at=now()where user_id=d.user_id;
 return jsonb_build_object('id',d.id,'user_id',d.user_id,'locale',d.locale);
end $$;

revoke all on function public.reader_claim(uuid,text,text),public.reader_claim_before_welcome(uuid,text,text),public.reader_welcome_claim(uuid)from public,anon,authenticated;
grant execute on function public.reader_claim(uuid,text,text),public.reader_claim_before_welcome(uuid,text,text),public.reader_welcome_claim(uuid)to service_role;
