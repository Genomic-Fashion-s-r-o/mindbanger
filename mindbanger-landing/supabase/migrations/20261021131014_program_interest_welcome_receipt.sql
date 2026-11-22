-- Receipt delivery is separate from optional campaign broadcasts. No existing contacts are queued.
create table public.program_interest_welcome (
 id uuid primary key default gen_random_uuid(),
 interest_id uuid not null unique references public.program_interest(id) on delete cascade,
 state text not null default 'queued' check(state in('queued','processing','sent','failed','review','skipped')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(), created_at timestamptz not null default now(),
 claimed_at timestamptz, finished_at timestamptz, lease uuid, provider_id text, error text,
 unsubscribe_token text, unsubscribe_hash text unique
);
alter table public.program_interest_welcome enable row level security;
revoke all on public.program_interest_welcome from public,anon,authenticated;
grant select,insert,update,delete on public.program_interest_welcome to service_role;
create index program_interest_welcome_queue on public.program_interest_welcome(available_at) where state='queued';

create function public.program_interest_register_welcome(p_email text,p_unsubscribe text,p_bucket text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare recipient uuid;
begin
 if not public.program_interest_register(p_email,p_unsubscribe,p_bucket) then return jsonb_build_object('ok',false);end if;
 select id into strict recipient from public.program_interest where email=p_email and state='confirmed' and consent_version='sugar-interest-genomic-2026-10-21';
 insert into public.program_interest_welcome(interest_id) values(recipient) on conflict(interest_id) do nothing;
 return jsonb_build_object('ok',true,'interestId',recipient);
end $$;

create function public.program_welcome_claim(p_interest uuid default null,p_limit integer default 5)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb;
begin
 update program_interest_welcome set state='review',error='interrupted_delivery_check_brevo',unsubscribe_token=null where state='processing' and claimed_at<now()-interval '5 minutes';
 update program_interest_welcome w set state='skipped',finished_at=now(),error='recipient_removed' where w.state='queued' and not exists(select 1 from program_interest i where i.id=w.interest_id and i.state='confirmed' and i.consent_version='sugar-interest-genomic-2026-10-21');
 with chosen as(select w.id,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') token from program_interest_welcome w join program_interest i on i.id=w.interest_id where w.state='queued' and w.available_at<=now() and(p_interest is null or w.interest_id=p_interest) order by w.created_at limit least(greatest(p_limit,1),10) for update of w skip locked),
 claimed as(update program_interest_welcome w set state='processing',lease=gen_random_uuid(),claimed_at=now(),attempts=attempts+1,unsubscribe_token=chosen.token,unsubscribe_hash=encode(sha256(chosen.token::bytea),'hex') from chosen where w.id=chosen.id returning w.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'interestId',w.interest_id,'lease',w.lease,'email',i.email,'token',w.unsubscribe_token)), '[]'::jsonb) into result from claimed w join program_interest i on i.id=w.interest_id;
 return result;
end $$;

create function public.program_welcome_finish(p_id uuid,p_lease uuid,p_state text,p_provider text default null,p_error text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_state not in('queued','sent','failed','review','skipped') then raise exception 'invalid_state';end if;
 update program_interest_welcome set state=case when p_state='queued' and attempts>=3 then 'failed' else p_state end,
 provider_id=left(p_provider,300),error=left(p_error,160),finished_at=case when p_state='queued' and attempts<3 then null else now() end,
 available_at=now()+interval '15 minutes',unsubscribe_token=null
 where id=p_id and lease=p_lease and state='processing';
 if not found then raise exception 'welcome_lease_lost';end if;
end $$;

create or replace function public.program_interest_unsubscribe(p_hash text) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 delete from program_interest i where unsubscribe_hash=p_hash
 or exists(select 1 from program_deliveries d where d.interest_id=i.id and d.unsubscribe_hash=p_hash)
 or exists(select 1 from program_interest_welcome w where w.interest_id=i.id and w.unsubscribe_hash=p_hash);
 return true;
end $$;
revoke all on function public.program_interest_register_welcome(text,text,text),public.program_welcome_claim(uuid,integer),public.program_welcome_finish(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.program_interest_register_welcome(text,text,text),public.program_welcome_claim(uuid,integer),public.program_welcome_finish(uuid,uuid,text,text,text) to service_role;
