-- Preserve existing prices, appointments, planner, permissions and payment flow.
CREATE OR REPLACE FUNCTION public.appointment_sales_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare b public.appointments; cfg jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  if new.kind='booking' and tg_op='INSERT' and new.catalog_version=1 then
    new.ends_at := new.starts_at + interval '50 minutes';
    if new.service_id='individualny-coaching' then new.price:=49; new.service_name:='Individuálny online coaching'; end if;
  end if;
  if new.kind='booking' then new.busy_until:=greatest(new.busy_until,new.ends_at+case when new.ends_at-new.starts_at=interval '25 minutes' then interval '5 minutes' else interval '10 minutes' end); end if;
  if new.status in ('pending','confirmed','completed','no_show','blocked') then
    for b in select * from public.appointments where id<>new.id and status in ('pending','confirmed','completed','no_show','blocked') and not(status='pending' and hold_until<=now()) loop
      if tstzrange(new.starts_at,new.busy_until,'[)') && tstzrange(b.starts_at,case when b.kind='booking' then greatest(b.busy_until,b.ends_at+case when b.ends_at-b.starts_at=interval '25 minutes' then interval '5 minutes' else interval '10 minutes' end) else b.busy_until end,'[)') then raise exception 'slot_unavailable' using errcode='23P01'; end if;
    end loop;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.appointment_save_settings(p_config jsonb, p_actor text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare current_planner jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  select config->'planner' into current_planner from public.appointment_settings where id=1 for update;
  if (p_config->>'bufferMinutes')::integer<10 or (p_config->>'slotMinutes')::integer not in(30,60) or exists(select 1 from jsonb_array_elements(p_config->'services') s where ((s->>'active')::boolean and(((s->>'minutes')::integer not in(25,50,80) or ((s->>'minutes')::integer=25 and (s->>'id'<>'rychly-rozhovor' or (s->>'slotMinutes')::integer is distinct from 30))) or(s->>'price')::numeric<=0 or(s->>'price')::numeric>1000))) then raise exception 'invalid_settings'; end if;
  update public.appointment_settings set config=(p_config-'planner') || case when current_planner is null then '{}'::jsonb else jsonb_build_object('planner',current_planner) end,updated_at=now() where id=1;
  insert into public.appointment_audit(actor,action) values(p_actor,'settings_updated');
end $function$
;

CREATE OR REPLACE FUNCTION public.appointment_change_legacy(p_id uuid, p_action text, p_actor text, p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_hash text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    cfg := cfg || jsonb_build_object('leadHours',0,'horizonDays',180);
    cfg := jsonb_set(cfg,'{services}',jsonb_build_array(jsonb_build_object('id',b.service_id,'active',true,'minutes',extract(epoch from (b.ends_at-b.starts_at))::integer/60)));
    cfg := jsonb_set(cfg,'{bufferMinutes}',to_jsonb(greatest(case when b.ends_at-b.starts_at=interval '25 minutes' then 5 else 10 end,extract(epoch from (b.busy_until-b.ends_at))::integer/60)));
    svc := public.appointment_validate_slot(cfg,b.service_id,p_start);
    -- Preserve the agreed price, service duration and location when rescheduling.
    update public.appointments set starts_at = p_start, ends_at = p_start + (b.ends_at-b.starts_at),
      busy_until = p_start + (b.ends_at-b.starts_at) + greatest(b.busy_until-b.ends_at,case when b.ends_at-b.starts_at=interval '25 minutes' then interval '5 minutes' else interval '10 minutes' end),
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
    if p_action='confirm' and b.service_id='individualny-coaching' then
      select config into strict cfg from public.appointment_settings where id=1;
      if not coalesce((cfg->>'stripeEnabled')::boolean,false) or not coalesce((cfg->>'legalReviewed')::boolean,false) then raise exception 'booking_disabled'; end if;
    end if;
    update public.appointments set status = new_status, hold_until = null, updated_at = now() where id = p_id;
    if p_action='cancel' and b.paid then update public.appointments set payment_review=true where id=p_id; end if;
    if p_action in ('confirm','cancel') then perform public.appointment_enqueue(p_id,case when p_action='confirm' then 'confirmed' else 'cancelled' end); end if;
  end if;
  insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,p_action);
end $function$
;

CREATE OR REPLACE FUNCTION public.appointment_create_catalog(p_user uuid, p_service text, p_start timestamp with time zone, p_name text, p_email text, p_phone text, p_hash text, p_request_id uuid, p_manage_url text, p_legal_version text, p_topic text, p_note text, p_adult boolean, p_package text DEFAULT ''::text, p_credit uuid DEFAULT NULL::uuid, p_participant text DEFAULT ''::text, p_age integer DEFAULT 0, p_guardian boolean DEFAULT false, p_actor text DEFAULT 'client'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare cfg jsonb;svc jsonb;offer jsonb;existing public.appointments;e public.appointment_packages;result uuid;amount numeric;mins integer;reserved integer;policy jsonb;
begin
 perform pg_advisory_xact_lock(710071);
 if p_user is null or p_adult is distinct from true or p_legal_version<>'2026-10-19-coaching-v2' or length(p_name)<2 or length(coalesce(p_note,''))>500 then raise exception 'client_required';end if;
 select * into existing from public.appointments where request_id=p_request_id;
 if found then
  if existing.user_id is distinct from p_user or existing.starts_at<>p_start or existing.service_id<>p_service or coalesce(existing.package_offer_id,'')<>coalesce(p_package,'') or(p_credit is not null and existing.entitlement_id is distinct from p_credit) or coalesce(existing.participant_age,0)<>p_age or coalesce(existing.participant_name,'')<>p_participant or coalesce(existing.topic_note,'')<>coalesce(p_note,'') then raise exception 'request_mismatch';end if;
  return existing.id;
 end if;
 select config into strict cfg from public.appointment_settings where id=1 for update;
 if (cfg->>'catalogVersion')::integer is distinct from 2 or not coalesce((cfg->>'enabled')::boolean,false) or not coalesce((cfg->>'stripeEnabled')::boolean,false) or not coalesce((cfg->>'legalReviewed')::boolean,false) or not coalesce((cfg->>'pricesApproved')::boolean,false) then raise exception 'booking_disabled';end if;
 if p_actor<>'client' then cfg:=cfg||jsonb_build_object('leadHours',0,'horizonDays',180);end if;
 svc:=public.appointment_validate_slot(cfg,p_service,p_start);mins:=(svc->>'minutes')::integer;amount:=(svc->>'price')::numeric;
 if (mins not in(25,50,80) or (mins=25 and p_service<>'rychly-rozhovor')) or amount<=0 or amount>1000 then raise exception 'invalid_service';end if;
 if p_age<>0 or p_participant<>'' or p_guardian then
  if p_service<>'teenager-pod-tlakom' or p_age not between 13 and 17 or length(p_participant)<2 or p_guardian is distinct from true then raise exception 'guardian_required';end if;
 end if;
 if coalesce(p_package,'')<>'' and p_credit is not null then raise exception 'invalid_package';end if;
 if coalesce(p_package,'')<>'' then
  select value into offer from jsonb_array_elements(cfg->'packages') where value->>'id'=p_package and value->>'serviceId'=p_service and(value->>'active')::boolean;
  if offer is null or mins<>50 then raise exception 'invalid_package';end if;amount:=(offer->>'price')::numeric;
 end if;
 perform public.appointment_expire();
 if p_credit is not null then
  select * into strict e from public.appointment_packages where id=p_credit and user_id=p_user and service_id=p_service and state='active' for update;
  select count(*) into reserved from public.appointment_package_sessions where package_id=e.id and state<>'released';
  if reserved>=e.total or mins<>50 then raise exception 'package_exhausted';end if;
  -- A guardian's purchased teenager package cannot silently change its participant.
  if coalesce((e.snapshot->>'participantAge')::integer,0)<>p_age or coalesce(e.snapshot->>'participantName','')<>p_participant then raise exception 'package_participant_mismatch';end if;
  amount:=0;
 end if;
 policy:=jsonb_build_object('version','2026-10-19-authorization-v1','paymentFlow','authorize_confirm','paymentHours',24,'cancellationHours',(cfg->>'cancellationHours')::integer,'lateCancellation',cfg->>'lateCancellation','provider',cfg->>'provider','companyId',cfg->>'companyId','registeredAddress',cfg->>'registeredAddress','registration',cfg->>'registration','email',cfg->>'email','phone',cfg->>'phone','minutes',mins,'slotMinutes',mins+case when mins=25 then 5 else 10 end,'serviceName',svc->>'name','package',offer);
 insert into public.appointments(request_id,user_id,status,starts_at,ends_at,busy_until,hold_until,service_id,service_name,price,location,customer_name,email,phone,manage_hash,legal_version,consent_at,topic,topic_note,payment_flow,payment_state,payment_terms,catalog_version,funding_type,paid,package_offer_id,package_snapshot,entitlement_id,participant_name,participant_age,guardian_consent_at)
 values(p_request_id,p_user,'pending',p_start,p_start+make_interval(mins=>mins),p_start+make_interval(mins=>mins+case when mins=25 then 5 else 10 end),case when p_credit is null then least(now()+interval '45 minutes',p_start-interval '30 minutes') else null end,p_service,svc->>'name',amount,cfg->>'address',p_name,lower(p_email),p_phone,p_hash,p_legal_version,now(),p_topic,coalesce(p_note,''),'authorize_confirm',case when p_credit is null then 'awaiting_checkout' else 'captured' end,policy,2,case when p_credit is null then 'card' else 'package' end,p_credit is not null,nullif(p_package,''),offer,p_credit,nullif(p_participant,''),nullif(p_age,0),case when p_guardian then now() else null end) returning id into result;
 if p_credit is not null then insert into public.appointment_package_sessions(appointment_id,package_id) values(result,p_credit);end if;
 insert into public.appointment_audit(appointment_id,actor,action) values(result,p_actor,'catalog_requested');perform public.appointment_enqueue(result,'requested',p_manage_url);return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.appointment_admin_manual(p_user uuid, p_service text, p_start timestamp with time zone, p_price numeric, p_note text, p_request uuid, p_actor uuid, p_participant text DEFAULT ''::text, p_age integer DEFAULT 0, p_guardian boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare cfg jsonb;svc jsonb;person record;c public.coaching_manual_contacts;b public.appointments;result uuid;mins integer;gap integer;
begin
 perform pg_advisory_xact_lock(710071);
 if p_actor is null or p_user is null or p_request is null or p_price is null or p_price<0 or p_price>10000 or p_price<>round(p_price,2) or length(coalesce(p_note,''))>500 then raise exception 'invalid_request';end if;
 select * into b from public.appointments where request_id=p_request;
 if found then
  if b.funding_type<>'manual' or b.user_id is distinct from p_user or b.service_id is distinct from p_service or b.starts_at is distinct from p_start or b.price is distinct from p_price or coalesce(b.topic_note,'')<>coalesce(p_note,'') or coalesce(b.participant_name,'')<>coalesce(p_participant,'') or coalesce(b.participant_age,0)<>p_age then raise exception 'request_mismatch';end if;
  return b.id;
 end if;
 if p_start is null or p_start<=now() or p_start>now()+interval '2 years' then raise exception 'invalid_slot';end if;
 select u.id,u.email,coalesce(nullif(p.full_name,''),u.email) name into person from auth.users u left join public.profiles p on p.id=u.id where u.id=p_user;
 if person.id is null or person.email is null then raise exception 'client_required';end if;
 select * into c from public.coaching_manual_contacts where user_id=p_user;
 select config into strict cfg from public.appointment_settings where id=1 for update;
 select value into svc from jsonb_array_elements(cfg->'services') where value->>'id'=p_service and (value->>'active')::boolean;
 mins:=(svc->>'minutes')::integer;gap:=case when mins=25 then 5 else greatest(10,coalesce((cfg->>'bufferMinutes')::integer,10)) end;
 if svc is null or (mins not in(25,50,80) or (mins=25 and p_service<>'rychly-rozhovor')) then raise exception 'invalid_service';end if;
 if p_age<>0 or p_participant<>'' or p_guardian then
  if p_service<>'teenager-pod-tlakom' or p_age not between 13 and 17 or length(btrim(p_participant))<2 or p_guardian is distinct from true then raise exception 'guardian_required';end if;
 end if;
 perform public.appointment_expire();
 insert into public.coaching_client_cards(user_id,actor) values(p_user,p_actor::text) on conflict(user_id) do nothing;
 insert into public.appointments(request_id,manage_hash,user_id,kind,status,starts_at,ends_at,busy_until,service_id,service_name,price,location,customer_name,email,phone,customer_first_name,customer_last_name,customer_city,customer_country,catalog_version,funding_type,payment_flow,payment_state,paid,topic_note,participant_name,participant_age,guardian_consent_at)
 values(p_request,gen_random_uuid()::text,p_user,'booking','confirmed',p_start,p_start+make_interval(mins=>mins),p_start+make_interval(mins=>mins+gap),p_service,svc->>'name',p_price,'Online · Google Meet',case when c.user_id is not null then c.first_name||' '||c.last_name else person.name end,person.email,coalesce(c.phone,''),c.first_name,c.last_name,c.city,c.country,2,'manual','authorize_confirm','released',false,coalesce(p_note,''),nullif(p_participant,''),nullif(p_age,0),case when p_guardian then now() else null end) returning id into result;
 -- INSERT has no video trigger: enqueue explicitly, once, in this transaction.
 update public.appointments set meeting_state='pending' where id=result;
 insert into public.appointment_video_jobs(appointment_id) values(result);
 insert into public.appointment_audit(appointment_id,actor,action) values(result,p_actor::text,'manual_booked_no_stripe');
 return result;
end $function$
;

CREATE OR REPLACE FUNCTION public.appointment_validate_slot(p_config jsonb, p_service_id text, p_start timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare svc jsonb; hrs jsonb; wall timestamp; finish timestamp; mins integer; step_minutes integer;
  planner jsonb; cells jsonb; plan jsonb; minute integer; cell integer;
begin
  step_minutes := coalesce((p_config->>'slotMinutes')::integer,30);
  if step_minutes not in (15,30,60) then raise exception 'invalid_slot'; end if;
  select value into svc from jsonb_array_elements(p_config->'services') where value->>'id'=p_service_id and (value->>'active')::boolean;
  if svc is null or p_start < now()+make_interval(hours=>(p_config->>'leadHours')::integer)
    or p_start > now()+make_interval(days=>(p_config->>'horizonDays')::integer) then raise exception 'invalid_slot'; end if;
  wall := p_start at time zone 'Europe/Bratislava';
  mins := (svc->>'minutes')::integer+case when (svc->>'minutes')::integer=25 then 5 else (p_config->>'bufferMinutes')::integer end;
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
end $function$
;
update public.appointment_settings set config=jsonb_set(config,'{services}',config->'services'||'[{"id":"rychly-rozhovor","name":"Rýchly rozhovor","price":26,"minutes":25,"slotMinutes":30,"active":true,"description":"Krátky online rozhovor na úvodné zoznámenie, ujasnenie spolupráce alebo konzultáciu jednej aktuálnej situácie."}]'::jsonb),updated_at=now() where id=1 and not exists(select 1 from jsonb_array_elements(config->'services') s where s->>'id'='rychly-rozhovor');
