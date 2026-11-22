-- All calendar writes share the existing lock; public callers cannot invoke admin operations.
grant usage on schema auth to service_role;
grant select(id,email,email_confirmed_at) on auth.users to service_role;
grant select(id,full_name) on public.profiles to service_role;
create function public.appointment_admin_clients(p_query text,p_version text)
returns table(id uuid,name text,email text,ready boolean)
language sql stable security invoker set search_path='' as $$
 select u.id,p.full_name,u.email::text,
   (u.email_confirmed_at is not null and length(trim(coalesce(p.full_name,'')))>=2 and exists(select 1 from public.client_consents c where c.user_id=u.id and c.version=p_version))
 from auth.users u left join public.profiles p on p.id=u.id
 where length(trim(p_query)) between 2 and 80
 and (strpos(lower(coalesce(u.email,'')),lower(trim(p_query)))>0 or strpos(lower(coalesce(p.full_name,'')),lower(trim(p_query)))>0)
 order by lower(coalesce(p.full_name,u.email)),u.id limit 20
$$;

create function public.appointment_disable_slot(p_start timestamptz,p_actor text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare cfg jsonb; existing uuid; svc jsonb;
begin
 perform pg_advisory_xact_lock(710071);
 select config into strict cfg from public.appointment_settings where id=1 for update;
 cfg:=cfg || jsonb_build_object('leadHours',0,'horizonDays',180);
 svc:=public.appointment_validate_slot(cfg,'individualny-coaching',p_start);
 select id into existing from public.appointments where kind='block' and status='blocked' and service_name='Vypnutý termín' and starts_at=p_start;
 if found then return existing; end if;
 return public.appointment_block(p_start,p_start+make_interval(mins=>50+greatest(10,(cfg->>'bufferMinutes')::integer)),'Vypnutý termín',p_actor);
end $$;

create function public.appointment_admin_assign(p_user uuid,p_start timestamptz,p_topic text,p_note text,p_request_id uuid,p_hash text,p_manage_url text,p_legal_version text,p_client_version text,p_confirm boolean,p_actor text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare cfg jsonb; svc jsonb; existing public.appointments; result uuid; client_name text; client_email text;
begin
 perform pg_advisory_xact_lock(710071);
 if p_user is null or p_actor is null or p_confirm is null or p_legal_version is distinct from '2026-10-19-coaching-v2' then raise exception 'invalid_request'; end if;
 if p_topic is null or p_topic not in ('pokojna-mysel','najdi-svoj-smer','sila-sustredenia','zivot-z-ineho-uhla','zatial-neviem') or length(coalesce(p_note,''))>500 then raise exception 'invalid_topic'; end if;
 select * into existing from public.appointments where request_id=p_request_id;
 if found then
   if existing.user_id is distinct from p_user or existing.starts_at is distinct from p_start or existing.topic is distinct from p_topic or existing.topic_note is distinct from coalesce(p_note,'') then raise exception 'request_mismatch'; end if;
   return existing.id;
 end if;
 select p.full_name,u.email into client_name,client_email from auth.users u join public.profiles p on p.id=u.id
 where u.id=p_user and u.email_confirmed_at is not null and exists(select 1 from public.client_consents c where c.user_id=u.id and c.version=p_client_version);
 if client_email is null or length(trim(coalesce(client_name,'')))<2 then raise exception 'client_account_required'; end if;
 select config into strict cfg from public.appointment_settings where id=1 for update;
 if not coalesce((cfg->>'legalReviewed')::boolean,false) or not coalesce((cfg->>'pricesApproved')::boolean,false) or (p_confirm and not coalesce((cfg->>'stripeEnabled')::boolean,false)) then raise exception 'booking_disabled'; end if;
 cfg:=cfg || jsonb_build_object('leadHours',0,'horizonDays',180);
 svc:=public.appointment_validate_slot(cfg,'individualny-coaching',p_start);
 if (svc->>'minutes')::integer is distinct from 50 or (svc->>'price')::numeric is distinct from 49 then raise exception 'invalid_settings'; end if;
 perform public.appointment_expire();
 insert into public.appointments(request_id,user_id,status,starts_at,ends_at,busy_until,hold_until,service_id,service_name,price,location,customer_name,email,phone,manage_hash,legal_version,consent_at,topic,topic_note)
 values(p_request_id,p_user,case when p_confirm then 'confirmed' else 'pending' end,p_start,p_start+interval '50 minutes',p_start+make_interval(mins=>50+greatest(10,(cfg->>'bufferMinutes')::integer)),case when p_confirm then null else least(now()+make_interval(hours=>(cfg->>'holdHours')::integer),p_start) end,'individualny-coaching',svc->>'name',49,cfg->>'address',client_name,lower(client_email),'',p_hash,p_legal_version,now(),p_topic,coalesce(p_note,'')) returning id into result;
 insert into public.appointment_audit(appointment_id,actor,action) values(result,p_actor,case when p_confirm then 'admin_assigned_confirmed' else 'admin_assigned_pending' end);
 perform public.appointment_enqueue(result,case when p_confirm then 'confirmed' else 'requested' end,p_manage_url);
 return result;
end $$;
revoke all on function public.appointment_admin_clients(text,text),public.appointment_disable_slot(timestamptz,text),public.appointment_admin_assign(uuid,timestamptz,text,text,uuid,text,text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.appointment_admin_clients(text,text),public.appointment_disable_slot(timestamptz,text),public.appointment_admin_assign(uuid,timestamptz,text,text,uuid,text,text,text,text,boolean,text) to service_role;

-- Administrative moves use the planned working time without public lead-time restrictions.
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
    cfg := cfg || jsonb_build_object('leadHours',0,'horizonDays',180);
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
    if p_action='confirm' and b.service_id='individualny-coaching' then
      select config into strict cfg from public.appointment_settings where id=1;
      if not coalesce((cfg->>'stripeEnabled')::boolean,false) or not coalesce((cfg->>'legalReviewed')::boolean,false) then raise exception 'booking_disabled'; end if;
    end if;
    update public.appointments set status = new_status, hold_until = null, updated_at = now() where id = p_id;
    if p_action='cancel' and b.paid then update public.appointments set payment_review=true where id=p_id; end if;
    if p_action in ('confirm','cancel') then perform public.appointment_enqueue(p_id,case when p_action='confirm' then 'confirmed' else 'cancelled' end); end if;
  end if;
  insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,p_action);
end $$;
