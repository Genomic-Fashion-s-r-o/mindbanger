-- Transactional receipts only for newly inserted requests. No historical backfill.
create table public.appointment_time_request_mail (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.appointment_time_requests(id) on delete cascade,
 audience text not null check(audience in('client','owner')),
 state text not null default 'queued' check(state in('queued','processing','sent','failed','review','skipped')),
 attempts integer not null default 0, available_at timestamptz not null default now(),
 created_at timestamptz not null default now(), claimed_at timestamptz, finished_at timestamptz,
 lease uuid, provider_id text, error text, unique(request_id,audience)
);
alter table public.appointment_time_request_mail enable row level security;
revoke all on public.appointment_time_request_mail from public,anon,authenticated;
grant select,insert,update,delete on public.appointment_time_request_mail to service_role;
create index appointment_time_request_mail_queue on public.appointment_time_request_mail(available_at,created_at) where state='queued';

create function public.appointment_time_request_queue_mail() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 insert into appointment_time_request_mail(request_id,audience) values(new.id,'client'),(new.id,'owner');
 return new;
end $$;
revoke all on function public.appointment_time_request_queue_mail() from public,anon,authenticated;
grant execute on function public.appointment_time_request_queue_mail() to service_role;
create trigger appointment_time_request_received after insert on public.appointment_time_requests
 for each row execute function public.appointment_time_request_queue_mail();

create function public.appointment_time_request_mail_claim(p_key uuid default null,p_limit integer default 10)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb;
begin
 update appointment_time_request_mail set state='review',error='interrupted_delivery_check_brevo',finished_at=now()
 where state='processing' and claimed_at<now()-interval '5 minutes';
 update appointment_time_request_mail m set state='skipped',error='request_expired',finished_at=now()
 where m.state='queued' and exists(select 1 from appointment_time_requests r where r.id=m.request_id and r.created_at<now()-interval '90 days');
 with chosen as (
  select m.id from appointment_time_request_mail m join appointment_time_requests r on r.id=m.request_id
  where m.state='queued' and m.available_at<=now() and (p_key is null or r.request_key=p_key)
  order by m.created_at,m.id limit least(greatest(p_limit,1),10) for update of m skip locked
 ), claimed as (
  update appointment_time_request_mail m set state='processing',lease=gen_random_uuid(),claimed_at=now(),attempts=m.attempts+1
  from chosen where m.id=chosen.id returning m.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'lease',m.lease,'audience',m.audience,
  'email',case when m.audience='client' then r.email else null end,'locale',r.locale)), '[]'::jsonb)
 into result from claimed m join appointment_time_requests r on r.id=m.request_id;
 return result;
end $$;

create function public.appointment_time_request_mail_finish(p_id uuid,p_lease uuid,p_state text,p_provider text default null,p_error text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_state not in('queued','sent','failed','review','skipped') then raise exception 'invalid_state';end if;
 update appointment_time_request_mail set state=case when p_state='queued' and attempts>=3 then 'failed' else p_state end,
 provider_id=left(p_provider,300),error=left(p_error,160),
 finished_at=case when p_state='queued' and attempts<3 then null else now() end,available_at=now()+interval '15 minutes'
 where id=p_id and lease=p_lease and state='processing';
 if not found then raise exception 'time_request_mail_lease_lost';end if;
end $$;
revoke all on function public.appointment_time_request_mail_claim(uuid,integer),public.appointment_time_request_mail_finish(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.appointment_time_request_mail_claim(uuid,integer),public.appointment_time_request_mail_finish(uuid,uuid,text,text,text) to service_role;
