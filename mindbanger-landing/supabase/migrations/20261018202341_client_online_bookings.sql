-- Account ownership is assigned in the same transaction as slot reservation.
create function public.appointment_create_for_client(
  p_user uuid,p_service_id text,p_start timestamptz,p_name text,p_email text,p_phone text,
  p_hash text,p_request_id uuid,p_manage_url text,p_legal_version text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare existing public.appointments; result uuid;
begin
  if p_user is null then raise exception 'client_required'; end if;
  perform pg_advisory_xact_lock(710071);
  select * into existing from public.appointments where request_id=p_request_id;
  if found and existing.user_id is distinct from p_user then raise exception 'request_mismatch'; end if;
  result := public.appointment_create(p_service_id,p_start,p_name,p_email,p_phone,p_hash,p_request_id,p_manage_url,p_legal_version,'client');
  update public.appointments set user_id=p_user where id=result;
  return result;
end $$;

create function public.appointment_cancel_for_client(p_user uuid,p_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
  perform pg_advisory_xact_lock(710071);
  select * into b from public.appointments where id=p_id and user_id=p_user and kind='booking' for update;
  if not found or p_user is null then raise exception 'booking_not_found'; end if;
  perform public.appointment_change(b.id,'cancel','client',null,b.manage_hash);
end $$;
revoke all on function public.appointment_create_for_client(uuid,text,timestamptz,text,text,text,text,uuid,text,text),
  public.appointment_cancel_for_client(uuid,uuid) from public,anon,authenticated;
grant execute on function public.appointment_create_for_client(uuid,text,timestamptz,text,text,text,text,uuid,text,text),
  public.appointment_cancel_for_client(uuid,uuid) to service_role;
