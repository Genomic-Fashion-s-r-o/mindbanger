create table public.appointment_time_requests (
 id uuid primary key default gen_random_uuid(), request_key uuid not null unique,
 first_name text not null check(length(first_name) between 1 and 80), last_name text not null check(length(last_name) between 1 and 80),
 email text not null check(length(email) between 3 and 254), phone text not null check(length(phone) between 7 and 40),
 time_windows text[] not null check(cardinality(time_windows) between 1 and 3 and time_windows <@ array['morning','afternoon','evening']::text[]),
 note text not null default '' check(length(note)<=1500), service_id text not null default '' check(length(service_id)<=100),
 service_name text not null default '' check(length(service_name)<=160), locale text not null default 'sk' check(locale in('sk','cs')),
 privacy_version text not null default 'time-request-2026-10-21',
 state text not null default 'new' check(state in('new','contacted','resolved','closed')),
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index appointment_time_requests_state_created on public.appointment_time_requests(state,created_at desc);
create index appointment_time_requests_created on public.appointment_time_requests(created_at);
create table public.appointment_time_request_limits(bucket text primary key,attempts integer not null,expires_at timestamptz not null);
alter table public.appointment_time_requests enable row level security;
alter table public.appointment_time_request_limits enable row level security;
revoke all on public.appointment_time_requests,public.appointment_time_request_limits from public,anon,authenticated;
grant select,insert,update,delete on public.appointment_time_requests,public.appointment_time_request_limits to service_role;

create function public.appointment_time_request_submit(p_key uuid,p_first text,p_last text,p_email text,p_phone text,p_windows text[],p_note text,p_service text,p_service_name text,p_locale text,p_bucket text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare previous appointment_time_requests; n integer;
begin
 perform pg_advisory_xact_lock(hashtext(p_key::text));
 select * into previous from appointment_time_requests where request_key=p_key;
 if found then
  if previous.first_name<>p_first or previous.last_name<>p_last or previous.email<>p_email or previous.phone<>p_phone or previous.time_windows<>p_windows or previous.note<>p_note or previous.service_id<>p_service or previous.locale<>p_locale then raise exception 'request_key_conflict';end if;
  return true;
 end if;
 delete from appointment_time_request_limits where expires_at<now();
 insert into appointment_time_request_limits values(p_bucket,1,now()+interval '1 hour') on conflict(bucket) do update set attempts=appointment_time_request_limits.attempts+1 returning attempts into n;
 if n>6 then return false;end if;
 insert into appointment_time_requests(request_key,first_name,last_name,email,phone,time_windows,note,service_id,service_name,locale)
 values(p_key,p_first,p_last,p_email,p_phone,p_windows,p_note,p_service,p_service_name,p_locale);
 return true;
end $$;
create function public.appointment_time_requests_purge() returns void language sql security invoker set search_path=public as $$
 delete from appointment_time_requests where created_at<now()-interval '90 days';
 delete from appointment_time_request_limits where expires_at<now();
$$;
revoke all on function public.appointment_time_request_submit(uuid,text,text,text,text,text[],text,text,text,text,text),public.appointment_time_requests_purge() from public,anon,authenticated;
grant execute on function public.appointment_time_request_submit(uuid,text,text,text,text,text[],text,text,text,text,text),public.appointment_time_requests_purge() to service_role;
