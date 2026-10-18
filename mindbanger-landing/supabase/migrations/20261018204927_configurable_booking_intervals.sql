-- Match the configured client grid in server-side validation. Existing grants are preserved.
create or replace function public.appointment_validate_slot(p_config jsonb, p_service_id text, p_start timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare svc jsonb; hrs jsonb; wall timestamp; finish timestamp; mins integer; step_minutes integer;
begin
  step_minutes := coalesce((p_config->>'slotMinutes')::integer,30);
  if step_minutes not in (15,30) then raise exception 'invalid_slot'; end if;
  select value into svc from jsonb_array_elements(p_config->'services') where value->>'id' = p_service_id and (value->>'active')::boolean;
  if svc is null or p_start < now() + make_interval(hours => (p_config->>'leadHours')::integer)
    or p_start > now() + make_interval(days => (p_config->>'horizonDays')::integer) then raise exception 'invalid_slot'; end if;
  wall := p_start at time zone 'Europe/Bratislava';
  select value into hrs from jsonb_array_elements(p_config->'hours') where (value->>'day')::integer = extract(dow from wall)::integer and (value->>'enabled')::boolean;
  mins := (svc->>'minutes')::integer + (p_config->>'bufferMinutes')::integer;
  finish := (p_start + make_interval(mins => mins)) at time zone 'Europe/Bratislava';
  if hrs is null or wall::time < (hrs->>'open')::time or finish::date <> wall::date
    or finish::time > (hrs->>'close')::time or finish <> wall + make_interval(mins => mins)
    or extract(epoch from (wall::time - (hrs->>'open')::time))::integer % (step_minutes * 60) <> 0 then raise exception 'invalid_slot'; end if;
  return svc;
end $$;
