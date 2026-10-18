-- Separate, server-only scheduling module. Existing engine tables are untouched.
create table public.appointment_settings (
  id integer primary key check (id = 1), config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.appointment_settings (id) values (1);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), request_id uuid unique,
  kind text not null default 'booking' check (kind in ('booking', 'block')),
  status text not null check (status in ('pending','confirmed','cancelled','expired','completed','no_show','blocked')),
  starts_at timestamptz not null, ends_at timestamptz not null, busy_until timestamptz not null,
  hold_until timestamptz, service_id text, service_name text not null,
  price numeric(8,2) not null default 0 check (price >= 0), location text not null default '',
  customer_name text, email text, phone text, manage_hash text unique,
  legal_version text, consent_at timestamptz, paid boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at > starts_at and busy_until >= ends_at),
  check (kind <> 'booking' or status not in ('blocked')),
  exclude using gist (tstzrange(starts_at, busy_until, '[)') with &&)
    where (status in ('pending','confirmed','completed','no_show','blocked'))
);
create index appointments_start_idx on public.appointments (starts_at);
create index appointments_expiry_idx on public.appointments (hold_until) where status = 'pending';
create table public.appointment_mail (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_key text not null unique, event text not null, audience text not null check (audience in ('client','owner')),
  payload jsonb not null, state text not null default 'queued' check (state in ('queued','sending','sent','failed')),
  attempts integer not null default 0, available_at timestamptz not null default now(),
  created_at timestamptz not null default now(), sent_at timestamptz
);
create index appointment_mail_queue_idx on public.appointment_mail (available_at) where state in ('queued','sending');
create table public.appointment_audit (
  id bigint generated always as identity primary key,
  appointment_id uuid references public.appointments(id) on delete cascade,
  actor text not null, action text not null, created_at timestamptz not null default now()
);
alter table public.appointment_settings enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_mail enable row level security;
alter table public.appointment_audit enable row level security;
revoke all on public.appointment_settings, public.appointments, public.appointment_mail, public.appointment_audit from public, anon, authenticated;
grant all on public.appointment_settings, public.appointments, public.appointment_mail, public.appointment_audit to service_role;
grant usage, select on sequence public.appointment_audit_id_seq to service_role;

create table public.appointment_rate (key text primary key, count integer not null, expires_at timestamptz not null);
alter table public.appointment_rate enable row level security;
revoke all on public.appointment_rate from public, anon, authenticated;
grant all on public.appointment_rate to service_role;
create function public.appointment_rate_limit(p_email_key text, p_ip_key text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare email_count integer; ip_count integer;
begin
  insert into public.appointment_rate as r values('email:'||p_email_key,1,now()+interval '1 hour')
    on conflict(key) do update set count=case when r.expires_at<=now() then 1 else r.count+1 end,
    expires_at=case when r.expires_at<=now() then now()+interval '1 hour' else r.expires_at end returning count into email_count;
  insert into public.appointment_rate as r values('ip:'||p_ip_key,1,now()+interval '1 hour')
    on conflict(key) do update set count=case when r.expires_at<=now() then 1 else r.count+1 end,
    expires_at=case when r.expires_at<=now() then now()+interval '1 hour' else r.expires_at end returning count into ip_count;
  return email_count<=5 and ip_count<=20;
end $$;
revoke all on function public.appointment_rate_limit(text,text) from public,anon,authenticated;
grant execute on function public.appointment_rate_limit(text,text) to service_role;

create function public.appointment_enqueue(p_id uuid, p_event text, p_url text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare b public.appointments; cfg jsonb; snapshot jsonb; key text;
begin
  select * into strict b from public.appointments where id = p_id;
  if b.kind <> 'booking' or b.email is null then return; end if;
  select config into cfg from public.appointment_settings where id = 1;
  snapshot := (to_jsonb(b) - 'manage_hash' - 'request_id') || jsonb_build_object('manageUrl', p_url, 'contactEmail', cfg->>'email', 'contactPhone', cfg->>'phone');
  key := p_id::text || ':' || p_event || ':' || extract(epoch from b.updated_at)::text;
  if p_event = 'reminder' then key := p_id::text || ':reminder:' || extract(epoch from b.starts_at)::text; end if;
  insert into public.appointment_mail(appointment_id,event_key,event,audience,payload)
    values(p_id,key || ':client',p_event,'client',snapshot) on conflict(event_key) do nothing;
  if p_event in ('requested','cancelled') and coalesce(cfg->>'email','') <> '' then
    insert into public.appointment_mail(appointment_id,event_key,event,audience,payload)
      values(p_id,key || ':owner',p_event,'owner',snapshot) on conflict(event_key) do nothing;
  end if;
end $$;

create function public.appointment_validate_slot(p_config jsonb, p_service_id text, p_start timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare svc jsonb; hrs jsonb; wall timestamp; finish timestamp; mins integer;
begin
  select value into svc from jsonb_array_elements(p_config->'services') where value->>'id' = p_service_id and (value->>'active')::boolean;
  if svc is null or p_start < now() + make_interval(hours => (p_config->>'leadHours')::integer)
    or p_start > now() + make_interval(days => (p_config->>'horizonDays')::integer) then raise exception 'invalid_slot'; end if;
  wall := p_start at time zone 'Europe/Bratislava';
  select value into hrs from jsonb_array_elements(p_config->'hours') where (value->>'day')::integer = extract(dow from wall)::integer and (value->>'enabled')::boolean;
  mins := (svc->>'minutes')::integer + (p_config->>'bufferMinutes')::integer;
  finish := (p_start + make_interval(mins => mins)) at time zone 'Europe/Bratislava';
  if hrs is null or wall::time < (hrs->>'open')::time or finish::date <> wall::date
    or finish::time > (hrs->>'close')::time or finish <> wall + make_interval(mins => mins)
    or extract(epoch from (wall::time - (hrs->>'open')::time))::integer % 900 <> 0 then raise exception 'invalid_slot'; end if;
  return svc;
end $$;

create function public.appointment_expire()
returns void language plpgsql security invoker set search_path = '' as $$
declare b public.appointments;
begin
  for b in update public.appointments set status='expired',updated_at=now() where status='pending' and hold_until<=now() returning * loop
    perform public.appointment_enqueue(b.id,'expired');
  end loop;
end $$;
revoke all on function public.appointment_expire() from public,anon,authenticated;
grant execute on function public.appointment_expire() to service_role;

create function public.appointment_create(p_service_id text, p_start timestamptz, p_name text, p_email text, p_phone text,
  p_hash text, p_request_id uuid, p_manage_url text, p_legal_version text, p_actor text default 'client')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare cfg jsonb; svc jsonb; existing public.appointments; result uuid; finish timestamptz;
begin
  -- Serialize configuration, expiry cleanup and all calendar mutations for one practitioner.
  perform pg_advisory_xact_lock(710071);
  select * into existing from public.appointments where request_id = p_request_id;
  if found then
    if existing.email <> lower(p_email) or existing.customer_name <> p_name or existing.service_id <> p_service_id or existing.starts_at <> p_start then raise exception 'request_mismatch'; end if;
    return existing.id;
  end if;
  select config into strict cfg from public.appointment_settings where id = 1 for update;
  if not coalesce((cfg->>'enabled')::boolean,false) then raise exception 'booking_disabled'; end if;
  svc := public.appointment_validate_slot(cfg,p_service_id,p_start);
  perform public.appointment_expire();
  finish := p_start + make_interval(mins => (svc->>'minutes')::integer);
  insert into public.appointments(request_id,status,starts_at,ends_at,busy_until,hold_until,service_id,service_name,price,location,customer_name,email,phone,manage_hash,legal_version,consent_at)
  values(p_request_id,'pending',p_start,finish,finish + make_interval(mins => (cfg->>'bufferMinutes')::integer),
    least(now() + make_interval(hours => (cfg->>'holdHours')::integer),p_start), p_service_id,svc->>'name',(svc->>'price')::numeric,cfg->>'address',p_name,lower(p_email),p_phone,p_hash,p_legal_version,now()) returning id into result;
  insert into public.appointment_audit(appointment_id,actor,action) values(result,p_actor,'requested');
  perform public.appointment_enqueue(result,'requested',p_manage_url);
  return result;
end $$;

create function public.appointment_change(p_id uuid, p_action text, p_actor text, p_start timestamptz default null, p_hash text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare b public.appointments; cfg jsonb; svc jsonb; new_status text;
begin
  perform pg_advisory_xact_lock(710071);
  perform public.appointment_expire();
  select * into strict b from public.appointments where id = p_id for update;
  if p_actor = 'client' and (p_hash is null or b.manage_hash is distinct from p_hash or p_action <> 'cancel') then raise exception 'invalid_transition'; end if;
  if p_action = 'cancel' and b.status = 'cancelled' then return; end if;
  if p_action = 'paid' and p_actor <> 'client' and b.kind = 'booking' then
    update public.appointments set paid = not paid, updated_at = now() where id = p_id;
  elsif p_action = 'move' and p_actor <> 'client' and b.status in ('pending','confirmed') then
    select config into strict cfg from public.appointment_settings where id = 1 for update;
    cfg := jsonb_set(cfg,'{services}',jsonb_build_array(jsonb_build_object('id',b.service_id,'active',true,'minutes',extract(epoch from (b.ends_at-b.starts_at))::integer/60)));
    cfg := jsonb_set(cfg,'{bufferMinutes}',to_jsonb(extract(epoch from (b.busy_until-b.ends_at))::integer/60));
    svc := public.appointment_validate_slot(cfg,b.service_id,p_start);
    -- Preserve the agreed price, service duration and location when rescheduling.
    update public.appointments set starts_at = p_start, ends_at = p_start + (b.ends_at-b.starts_at),
      busy_until = p_start + (b.busy_until-b.starts_at),
      hold_until = case when b.status = 'pending' then least(now()+make_interval(hours=>(cfg->>'holdHours')::integer),p_start) else null end,
      updated_at = now() where id = p_id;
    perform public.appointment_enqueue(p_id,'moved');
  else
    new_status := case p_action when 'confirm' then 'confirmed' when 'cancel' then 'cancelled' when 'complete' then 'completed' when 'no_show' then 'no_show' else null end;
    if new_status is null or not (
      (p_action = 'confirm' and b.status = 'pending' and p_actor <> 'client' and b.starts_at > now()) or
      (p_action = 'cancel' and b.status in ('pending','confirmed','blocked') and (p_actor <> 'client' or b.starts_at > now())) or
      (p_action in ('complete','no_show') and b.status = 'confirmed' and p_actor <> 'client' and b.starts_at <= now())
    ) then raise exception 'invalid_transition'; end if;
    update public.appointments set status = new_status, hold_until = null, updated_at = now() where id = p_id;
    if p_action in ('confirm','cancel') then perform public.appointment_enqueue(p_id,case when p_action='confirm' then 'confirmed' else 'cancelled' end); end if;
  end if;
  insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,p_action);
end $$;

create function public.appointment_block(p_start timestamptz, p_end timestamptz, p_label text, p_actor text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(710071);
  perform public.appointment_expire();
  if p_end <= p_start or p_end > p_start + interval '60 days' then raise exception 'invalid_slot'; end if;
  insert into public.appointments(kind,status,starts_at,ends_at,busy_until,service_name)
    values('block','blocked',p_start,p_end,p_end,p_label) returning id into result;
  insert into public.appointment_audit(appointment_id,actor,action) values(result,p_actor,'blocked');
  return result;
end $$;

create function public.appointment_save_settings(p_config jsonb, p_actor text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(710071);
  update public.appointment_settings set config=p_config,updated_at=now() where id=1;
  insert into public.appointment_audit(actor,action) values(p_actor,'settings_updated');
end $$;

create function public.appointment_claim_mail(p_limit integer default 10)
returns setof public.appointment_mail language plpgsql security invoker set search_path = '' as $$
declare b public.appointments;
begin
  perform pg_advisory_xact_lock(710071);
  perform public.appointment_expire();
  for b in select * from public.appointments where status='confirmed' and starts_at > now() and starts_at <= now()+interval '24 hours' loop
    perform public.appointment_enqueue(b.id,'reminder');
  end loop;
  -- Booking contacts are operational data, not accounting records. Purge after one year.
  delete from public.appointment_mail where created_at < now()-interval '30 days';
  delete from public.appointment_rate where expires_at < now()-interval '1 day';
  update public.appointments set customer_name=null,email=null,phone=null,manage_hash=null,request_id=null where ends_at < now()-interval '1 year' and email is not null;
  delete from public.appointment_audit where created_at < now()-interval '1 year';
  return query update public.appointment_mail set state='sending',attempts=attempts+1,available_at=now()+interval '5 minutes'
    where id in (select id from public.appointment_mail where (state='queued' or (state='sending' and available_at<=now())) and available_at<=now() and attempts<5 order by created_at limit least(p_limit,20) for update skip locked)
    returning *;
end $$;

revoke all on function public.appointment_enqueue(uuid,text,text), public.appointment_validate_slot(jsonb,text,timestamptz),
  public.appointment_create(text,timestamptz,text,text,text,text,uuid,text,text,text), public.appointment_change(uuid,text,text,timestamptz,text),
  public.appointment_block(timestamptz,timestamptz,text,text), public.appointment_save_settings(jsonb,text), public.appointment_claim_mail(integer) from public, anon, authenticated;
grant execute on function public.appointment_enqueue(uuid,text,text), public.appointment_validate_slot(jsonb,text,timestamptz),
  public.appointment_create(text,timestamptz,text,text,text,text,uuid,text,text,text), public.appointment_change(uuid,text,text,timestamptz,text),
  public.appointment_block(timestamptz,timestamptz,text,text), public.appointment_save_settings(jsonb,text), public.appointment_claim_mail(integer) to service_role;
