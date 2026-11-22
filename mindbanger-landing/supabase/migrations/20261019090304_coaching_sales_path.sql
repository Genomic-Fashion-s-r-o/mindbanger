-- Additive coaching rollout. No historical booking price/duration is rewritten.
alter table public.appointments add column payment_refunded boolean not null default false;
alter table public.appointments add column checkout_attempt integer not null default 0;
alter table public.appointments add column topic text;
alter table public.appointments add column topic_note text;
alter table public.appointments add column stripe_session_id text unique;
alter table public.appointments add column payment_intent_id text unique;
alter table public.appointments add column payment_review boolean not null default false;
alter table public.appointments add constraint appointment_topic_note_length check (length(topic_note) <= 500);

create function public.appointment_sales_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare b public.appointments; cfg jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  if new.kind='booking' and tg_op='INSERT' then
    new.ends_at := new.starts_at + interval '50 minutes';
    if new.service_id='individualny-coaching' then new.price:=49; new.service_name:='Individuálny online coaching'; end if;
  end if;
  if new.kind='booking' then new.busy_until:=greatest(new.busy_until,new.ends_at+interval '10 minutes'); end if;
  if new.status in ('pending','confirmed','completed','no_show','blocked') then
    for b in select * from public.appointments where id<>new.id and status in ('pending','confirmed','completed','no_show','blocked') and not(status='pending' and hold_until<=now()) loop
      if tstzrange(new.starts_at,new.busy_until,'[)') && tstzrange(b.starts_at,case when b.kind='booking' then greatest(b.busy_until,b.ends_at+interval '10 minutes') else b.busy_until end,'[)') then raise exception 'slot_unavailable' using errcode='23P01'; end if;
    end loop;
  end if;
  return new;
end $$;
create trigger appointment_sales_guard before insert or update of starts_at,ends_at,busy_until,status on public.appointments for each row execute function public.appointment_sales_guard();
revoke all on function public.appointment_sales_guard() from public,anon,authenticated;
grant execute on function public.appointment_sales_guard() to service_role;

create function public.appointment_create_coaching(
 p_user uuid,p_start timestamptz,p_name text,p_email text,p_phone text,p_hash text,p_request_id uuid,p_manage_url text,p_legal_version text,p_topic text,p_note text,p_adult boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare existing public.appointments; cfg jsonb; svc jsonb; result uuid;
begin
 perform pg_advisory_xact_lock(710071);
 if p_user is null or p_adult is distinct from true or p_legal_version<>'2026-10-19-coaching-v2' then raise exception 'client_required'; end if;
 if p_topic not in ('pokojna-mysel','najdi-svoj-smer','sila-sustredenia','zivot-z-ineho-uhla','zatial-neviem') or p_topic is null or length(coalesce(p_note,''))>500 then raise exception 'invalid_topic'; end if;
 select * into existing from public.appointments where request_id=p_request_id;
 if found then
  if existing.user_id is distinct from p_user or existing.starts_at<>p_start or existing.service_id<>'individualny-coaching' or existing.topic is distinct from p_topic or existing.topic_note is distinct from coalesce(p_note,'') then raise exception 'request_mismatch'; end if;
  return existing.id;
 end if;
 select config into strict cfg from public.appointment_settings where id=1 for update;
 if not coalesce((cfg->>'enabled')::boolean,false) or not coalesce((cfg->>'legalReviewed')::boolean,false) or not coalesce((cfg->>'pricesApproved')::boolean,false) or not coalesce((cfg->>'stripeEnabled')::boolean,false) then raise exception 'booking_disabled'; end if;
 svc:=public.appointment_validate_slot(cfg,'individualny-coaching',p_start);
 if (svc->>'minutes')::integer<>50 or (svc->>'price')::numeric<>49 or (cfg->>'bufferMinutes')::integer<10 then raise exception 'booking_disabled'; end if;
 perform public.appointment_expire();
 insert into public.appointments(request_id,user_id,status,starts_at,ends_at,busy_until,hold_until,service_id,service_name,price,location,customer_name,email,phone,manage_hash,legal_version,consent_at,topic,topic_note)
 values(p_request_id,p_user,'pending',p_start,p_start+interval '50 minutes',p_start+make_interval(mins=>50+(cfg->>'bufferMinutes')::integer),least(now()+make_interval(hours=>(cfg->>'holdHours')::integer),p_start),'individualny-coaching',svc->>'name',49,cfg->>'address',p_name,lower(p_email),p_phone,p_hash,p_legal_version,now(),p_topic,coalesce(p_note,'')) returning id into result;
 insert into public.appointment_audit(appointment_id,actor,action) values(result,'client','requested');
 perform public.appointment_enqueue(result,'requested',p_manage_url);
 return result;
end $$;
revoke all on function public.appointment_create_coaching(uuid,timestamptz,text,text,text,text,uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.appointment_create_coaching(uuid,timestamptz,text,text,text,text,uuid,text,text,text,text,boolean) to service_role;

-- An idempotent checkout identity is reserved inside the same calendar lock.
create function public.appointment_prepare_payment(p_id uuid,p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.appointments; cfg jsonb;
begin
 perform pg_advisory_xact_lock(710071);
 select * into b from public.appointments where id=p_id and user_id=p_user and kind='booking' for update;
 if not found or p_user is null or b.service_id<>'individualny-coaching' or b.status<>'confirmed' or b.starts_at<=now() or b.paid or b.payment_review then raise exception 'payment_unavailable'; end if;
 select config into cfg from public.appointment_settings where id=1;
 if not coalesce((cfg->>'stripeEnabled')::boolean,false) then raise exception 'payment_unavailable'; end if;
 return jsonb_build_object('id',b.id,'price',b.price,'email',b.email,'stripe_session_id',b.stripe_session_id,'starts_at',b.starts_at,'attempt',b.checkout_attempt);
end $$;
create function public.appointment_attach_checkout(p_id uuid,p_user uuid,p_session text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(710071);
 update public.appointments set stripe_session_id=p_session where id=p_id and user_id=p_user and service_id='individualny-coaching' and status='confirmed' and starts_at>now() and not paid and (stripe_session_id is null or stripe_session_id=p_session);
 if not found then raise exception 'payment_unavailable'; end if;
end $$;
-- Signed Stripe events supply a session looked up server-side; frontend redirects never mark paid.
create function public.appointment_record_payment(p_id uuid,p_session text,p_intent text,p_amount integer,p_currency text,p_refunded boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);
 select * into strict b from public.appointments where id=p_id and service_id='individualny-coaching' for update;
 if b.stripe_session_id is not null and b.stripe_session_id<>p_session then raise exception 'payment_mismatch'; end if;
 if p_amount<>(b.price*100)::integer or p_currency<>'eur' or p_intent is null then raise exception 'payment_mismatch'; end if;
 if b.payment_intent_id is not null and b.payment_intent_id<>p_intent then raise exception 'payment_mismatch'; end if;
 if b.payment_refunded then return; end if;
 if (b.paid and not p_refunded) or (p_refunded and not b.paid and b.payment_review) then return; end if;
 update public.appointments set stripe_session_id=p_session,payment_intent_id=p_intent,paid=not p_refunded,payment_refunded=p_refunded,payment_review=p_refunded or status<>'confirmed',updated_at=now() where id=p_id;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,'stripe',case when p_refunded then 'payment_refunded' else 'payment_verified' end);
 if not p_refunded then perform public.appointment_enqueue(p_id,'payment_received'); end if;
end $$;
revoke all on function public.appointment_prepare_payment(uuid,uuid),public.appointment_attach_checkout(uuid,uuid,text),public.appointment_record_payment(uuid,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.appointment_prepare_payment(uuid,uuid),public.appointment_attach_checkout(uuid,uuid,text),public.appointment_record_payment(uuid,text,text,integer,text,boolean) to service_role;

create or replace function public.appointment_validate_slot(p_config jsonb, p_service_id text, p_start timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare svc jsonb; hrs jsonb; wall timestamp; finish timestamp; mins integer; step_minutes integer;
  planner jsonb; cells jsonb; plan jsonb; minute integer; cell integer;
begin
  step_minutes := coalesce((p_config->>'slotMinutes')::integer,30);
  if step_minutes not in (15,30,60) then raise exception 'invalid_slot'; end if;
  select value into svc from jsonb_array_elements(p_config->'services') where value->>'id'=p_service_id and (value->>'active')::boolean;
  if svc is null or p_start < now()+make_interval(hours=>(p_config->>'leadHours')::integer)
    or p_start > now()+make_interval(days=>(p_config->>'horizonDays')::integer) then raise exception 'invalid_slot'; end if;
  wall := p_start at time zone 'Europe/Bratislava';
  mins := (svc->>'minutes')::integer+(p_config->>'bufferMinutes')::integer;
  finish := (p_start+make_interval(mins=>mins)) at time zone 'Europe/Bratislava';
  if finish::date <> wall::date or finish <> wall+make_interval(mins=>mins) then raise exception 'invalid_slot'; end if;
  planner := p_config->'planner';
  if planner is not null and planner <> 'null'::jsonb then
    select value->'cells' into cells from jsonb_array_elements(planner->'exceptions') where value->>'date'=wall::date::text;
    if cells is null then
      select value into plan from jsonb_array_elements(planner->'plans') where value->>'from'<=wall::date::text and value->>'to'>=wall::date::text;
      select value->'cells' into cells from jsonb_array_elements(plan->'week') where (value->>'day')::integer=extract(dow from wall)::integer;
    end if;
    minute := extract(hour from wall)::integer*60+extract(minute from wall)::integer;
    if cells is null or extract(second from wall)<>0 or minute % step_minutes<>0 then raise exception 'invalid_slot'; end if;
    for cell in (minute/30)..(ceil((minute+mins)::numeric/30)::integer-1) loop
      if not cells @> jsonb_build_array(cell) then raise exception 'invalid_slot'; end if;
    end loop;
  else
    select value into hrs from jsonb_array_elements(p_config->'hours') where (value->>'day')::integer=extract(dow from wall)::integer and (value->>'enabled')::boolean;
    if hrs is null or wall::time<(hrs->>'open')::time or finish::time>(hrs->>'close')::time
      or extract(epoch from (wall::time-(hrs->>'open')::time))::integer % (step_minutes*60)<>0 then raise exception 'invalid_slot'; end if;
  end if;
  return svc;
end $$;

create or replace function public.appointment_change(p_id uuid, p_action text, p_actor text, p_start timestamptz default null, p_hash text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare b public.appointments; cfg jsonb; svc jsonb; new_status text;
begin
  perform pg_advisory_xact_lock(710071);
  perform public.appointment_expire();
  select * into strict b from public.appointments where id = p_id for update;
  if p_actor = 'client' and (p_hash is null or b.manage_hash is distinct from p_hash or p_action <> 'cancel') then raise exception 'invalid_transition'; end if;
  if p_action = 'cancel' and b.status = 'cancelled' then return; end if;
  if p_action = 'paid' and p_actor <> 'client' and b.kind = 'booking' then
    raise exception 'stripe_verification_required';
  elsif p_action = 'move' and p_actor <> 'client' and b.status in ('pending','confirmed') then
    select config into strict cfg from public.appointment_settings where id = 1 for update;
    cfg := jsonb_set(cfg,'{services}',jsonb_build_array(jsonb_build_object('id',b.service_id,'active',true,'minutes',extract(epoch from (b.ends_at-b.starts_at))::integer/60)));
    cfg := jsonb_set(cfg,'{bufferMinutes}',to_jsonb(greatest(10,extract(epoch from (b.busy_until-b.ends_at))::integer/60)));
    svc := public.appointment_validate_slot(cfg,b.service_id,p_start);
    -- Preserve the agreed price, service duration and location when rescheduling.
    update public.appointments set starts_at = p_start, ends_at = p_start + (b.ends_at-b.starts_at),
      busy_until = p_start + (b.ends_at-b.starts_at) + greatest(b.busy_until-b.ends_at,interval '10 minutes'),
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
    if p_action='cancel' and b.paid then update public.appointments set payment_review=true where id=p_id; end if;
    if p_action in ('confirm','cancel') then perform public.appointment_enqueue(p_id,case when p_action='confirm' then 'confirmed' else 'cancelled' end); end if;
  end if;
  insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,p_action);
end $$;


create or replace function public.appointment_save_settings(p_config jsonb, p_actor text)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_planner jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  select config->'planner' into current_planner from public.appointment_settings where id=1 for update;
  if (p_config->>'bufferMinutes')::integer<10 or (p_config->>'slotMinutes')::integer<>60 or exists(select 1 from jsonb_array_elements(p_config->'services') s where (s->>'minutes')::integer<>50 or (s->>'id'='individualny-coaching' and (s->>'price')::numeric<>49)) then raise exception 'invalid_settings'; end if;
  update public.appointment_settings set config=(p_config-'planner') || case when current_planner is null then '{}'::jsonb else jsonb_build_object('planner',current_planner) end,updated_at=now() where id=1;
  insert into public.appointment_audit(actor,action) values(p_actor,'settings_updated');
end $$;


update public.appointment_settings set config = config || jsonb_build_object('enabled',false,'stripeEnabled',false,'slotMinutes',60,'bufferMinutes',greatest(10,coalesce((config->>'bufferMinutes')::integer,10)),'services',jsonb_build_array(jsonb_build_object('id','individualny-coaching','name','Individuálny online coaching','description','Online coaching pre dospelých: myšlienky, rozhodovanie, sústredenie a ďalší krok.','minutes',50,'price',49,'active',true)) || coalesce((select jsonb_agg((s-'minutes'-'active') || jsonb_build_object('minutes',50,'active',false)) from jsonb_array_elements(config->'services') s where s->>'id'<>'individualny-coaching'),'[]'::jsonb)) where id=1;
-- Expired checkout sessions can be retried with a fresh, serialized idempotency key.

create function public.appointment_reset_checkout(p_id uuid,p_user uuid,p_session text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(710071);
 update public.appointments set stripe_session_id=null,checkout_attempt=checkout_attempt+1 where id=p_id and user_id=p_user and stripe_session_id=p_session and not paid and status='confirmed';
 if not found then raise exception 'payment_changed'; end if;
end $$;
revoke all on function public.appointment_reset_checkout(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.appointment_reset_checkout(uuid,uuid,text) to service_role;

create or replace function public.appointment_claim_mail(p_limit integer default 10)
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
  update public.appointments set customer_name=null,email=null,phone=null,topic_note=null,manage_hash=null,request_id=null where ends_at < now()-interval '1 year' and email is not null;
  delete from public.appointment_audit where created_at < now()-interval '1 year';
  return query update public.appointment_mail set state='sending',attempts=attempts+1,available_at=now()+interval '5 minutes'
    where id in (select id from public.appointment_mail where (state='queued' or (state='sending' and available_at<=now())) and available_at<=now() and attempts<5 order by created_at limit least(p_limit,20) for update skip locked)
    returning *;
end $$;


create or replace function public.appointment_enqueue(p_id uuid, p_event text, p_url text default null)
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
  if p_event in ('requested','cancelled','payment_received') and coalesce(cfg->>'email','') <> '' then
    insert into public.appointment_mail(appointment_id,event_key,event,audience,payload)
      values(p_id,key || ':owner',p_event,'owner',snapshot) on conflict(event_key) do nothing;
  end if;
end $$;


-- Refund totals are monotonic, so delayed/replayed events cannot undo a refund.
alter table public.appointments add column stripe_refunded_amount integer not null default 0;
create function public.appointment_record_refund(p_id uuid,p_intent text,p_amount integer,p_refunded_amount integer,p_currency text)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);
 select * into strict b from public.appointments where id=p_id and service_id='individualny-coaching' for update;
 if p_intent is null or b.payment_intent_id is distinct from p_intent or p_currency is distinct from 'eur' or p_amount is distinct from (b.price*100)::integer or p_refunded_amount is null or p_refunded_amount<=0 or p_refunded_amount>p_amount then raise exception 'payment_mismatch'; end if;
 if p_refunded_amount<=b.stripe_refunded_amount then return; end if;
 if p_refunded_amount=p_amount then
  perform public.appointment_record_payment(p_id,b.stripe_session_id,p_intent,p_amount,p_currency,true);
 else
  insert into public.appointment_audit(appointment_id,actor,action) values(p_id,'stripe','payment_partial_refund');
 end if;
 update public.appointments set stripe_refunded_amount=p_refunded_amount,payment_review=true,updated_at=now() where id=p_id;
end $$;
revoke all on function public.appointment_record_refund(uuid,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.appointment_record_refund(uuid,text,integer,integer,text) to service_role;
