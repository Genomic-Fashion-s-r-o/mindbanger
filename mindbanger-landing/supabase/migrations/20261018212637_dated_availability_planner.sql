-- Only the MFA-checked admin API may save this JSON schedule. Same lock as booking creation.
create function public.appointment_save_planner(p_planner jsonb, p_expected jsonb, p_actor text)
returns void language plpgsql security invoker set search_path = '' as $$
declare cfg jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  select config into strict cfg from public.appointment_settings where id=1 for update;
  if (cfg->'planner') is distinct from p_expected then raise exception 'schedule_changed'; end if;
  if jsonb_typeof(p_planner->'plans') is distinct from 'array' or jsonb_typeof(p_planner->'exceptions') is distinct from 'array' then raise exception 'invalid_schedule'; end if;
  update public.appointment_settings set config=jsonb_set(cfg,'{planner}',p_planner),updated_at=now() where id=1;
  insert into public.appointment_audit(actor,action) values(p_actor,'availability_updated');
end $$;
revoke all on function public.appointment_save_planner(jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.appointment_save_planner(jsonb,jsonb,text) to service_role;

-- General settings cannot overwrite a planner edited separately in another tab.
create or replace function public.appointment_save_settings(p_config jsonb, p_actor text)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_planner jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  select config->'planner' into current_planner from public.appointment_settings where id=1 for update;
  update public.appointment_settings set config=(p_config-'planner') || case when current_planner is null then '{}'::jsonb else jsonb_build_object('planner',current_planner) end,updated_at=now() where id=1;
  insert into public.appointment_audit(actor,action) values(p_actor,'settings_updated');
end $$;

create or replace function public.appointment_validate_slot(p_config jsonb, p_service_id text, p_start timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare svc jsonb; hrs jsonb; wall timestamp; finish timestamp; mins integer; step_minutes integer;
  planner jsonb; cells jsonb; plan jsonb; minute integer; cell integer;
begin
  step_minutes := coalesce((p_config->>'slotMinutes')::integer,30);
  if step_minutes not in (15,30) then raise exception 'invalid_slot'; end if;
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
