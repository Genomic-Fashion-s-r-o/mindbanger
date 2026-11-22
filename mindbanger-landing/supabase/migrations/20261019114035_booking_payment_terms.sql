-- Policies and deadlines are snapshots; existing bookings are not rewritten.
alter table public.appointments
 add column payment_due_at timestamptz,
 add column payment_terms jsonb,
 add column checkout_terms_version text,
 add column checkout_terms_at timestamptz,
 add column early_service_consent boolean not null default false,
 add column contract_at timestamptz,
 add column withdrawal_at timestamptz;

create function public.appointment_payment_snapshot()
returns trigger language plpgsql security invoker set search_path='' as $$
declare cfg jsonb;
begin
 if new.kind<>'booking' or new.service_id<>'individualny-coaching' then return new; end if;
 if tg_op='INSERT' then
  select config into strict cfg from public.appointment_settings where id=1;
  if coalesce((cfg->>'paymentHours')::integer,24) not between 1 and 72 or coalesce(cfg->>'lateCancellation','refund') not in ('refund','individual') then raise exception 'invalid_settings'; end if;
  new.payment_terms:=jsonb_build_object('version','2026-10-19-payment-v1','paymentHours',coalesce((cfg->>'paymentHours')::integer,24),'cancellationHours',coalesce((cfg->>'cancellationHours')::integer,24),'lateCancellation',coalesce(cfg->>'lateCancellation','refund'),'provider',cfg->>'provider','companyId',cfg->>'companyId','registeredAddress',cfg->>'registeredAddress','registration',cfg->>'registration','email',cfg->>'email','phone',cfg->>'phone');
 end if;
 if new.status='confirmed' and (tg_op='INSERT' or old.status='pending') then
  if new.starts_at<=now()+interval '65 minutes' then raise exception 'confirmation_too_late'; end if;
  if new.payment_terms is null then raise exception 'payment_terms_missing'; end if;
  new.payment_due_at:=least(now()+make_interval(hours=>(new.payment_terms->>'paymentHours')::integer),new.starts_at-interval '30 minutes');
 end if;
 if tg_op='UPDATE' then
  if new.starts_at is distinct from old.starts_at and old.status='confirmed' and not old.paid and old.payment_due_at is not null then
   -- An issued checkout must be expired before moving its payment deadline.
   if old.stripe_session_id is not null then raise exception 'checkout_move_requires_cancel'; end if;
   new.payment_due_at:=least(old.payment_due_at,new.starts_at-interval '30 minutes');
   if new.payment_due_at<=now()+interval '31 minutes' then raise exception 'confirmation_too_late'; end if;
  end if;
  if new.paid and not old.paid and old.contract_at is null then new.contract_at:=now(); end if;
 end if;
 return new;
end $$;
create trigger appointment_payment_snapshot before insert or update of status,starts_at,paid on public.appointments
for each row execute function public.appointment_payment_snapshot();
revoke all on function public.appointment_payment_snapshot() from public,anon,authenticated;
grant execute on function public.appointment_payment_snapshot() to service_role;

create or replace function public.appointment_prepare_payment(p_id uuid,p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.appointments; cfg jsonb;
begin
 perform pg_advisory_xact_lock(710071);
 select * into b from public.appointments where id=p_id and user_id=p_user and kind='booking' for update;
 if not found or p_user is null or b.service_id<>'individualny-coaching' or b.status<>'confirmed' or b.starts_at<=now() or b.paid or b.payment_review or b.withdrawal_at is not null or b.payment_due_at is null or b.payment_due_at<=now() then raise exception 'payment_unavailable'; end if;
 select config into cfg from public.appointment_settings where id=1;
 if not coalesce((cfg->>'stripeEnabled')::boolean,false) then raise exception 'payment_unavailable'; end if;
 return jsonb_build_object('id',b.id,'price',b.price,'email',b.email,'stripe_session_id',b.stripe_session_id,'starts_at',b.starts_at,'attempt',b.checkout_attempt,'payment_due_at',b.payment_due_at,'payment_terms',b.payment_terms);
end $$;

create function public.appointment_accept_payment_terms(p_id uuid,p_user uuid,p_version text,p_early boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);
 perform public.appointment_prepare_payment(p_id,p_user);
 select * into strict b from public.appointments where id=p_id for update;
 if p_version is distinct from '2026-10-19-payment-v1' or b.payment_terms->>'version' is distinct from p_version or p_early is null then raise exception 'invalid_payment_terms'; end if;
 if b.starts_at<now()+interval '15 days' and not p_early then raise exception 'early_service_consent_required'; end if;
 update public.appointments set checkout_terms_version=p_version,checkout_terms_at=now(),early_service_consent=p_early where id=p_id;
end $$;

create or replace function public.appointment_attach_checkout(p_id uuid,p_user uuid,p_session text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(710071);
 update public.appointments set stripe_session_id=p_session where id=p_id and user_id=p_user and service_id='individualny-coaching' and status='confirmed' and starts_at>now() and not paid and not payment_review and withdrawal_at is null and payment_due_at>now() and checkout_terms_at is not null and checkout_terms_version=payment_terms->>'version' and (stripe_session_id is null or stripe_session_id=p_session);
 if not found then raise exception 'payment_unavailable'; end if;
end $$;

-- Receipt is durable and does not decide statutory eligibility or execute a refund.
create function public.appointment_withdraw(p_id uuid,p_user uuid)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare b public.appointments; receipt timestamptz;
begin
 perform pg_advisory_xact_lock(710071);
 select * into b from public.appointments where id=p_id and user_id=p_user and kind='booking' and service_id='individualny-coaching' for update;
 if not found or p_user is null or b.contract_at is null then raise exception 'booking_not_found'; end if;
 if b.withdrawal_at is not null then return b.withdrawal_at; end if;
 receipt:=now();
 update public.appointments set withdrawal_at=receipt,payment_review=true,status=case when status in ('pending','confirmed') and starts_at>now() then 'cancelled' else status end,updated_at=receipt where id=p_id;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,'client','withdrawal_received');
 perform public.appointment_enqueue(p_id,'withdrawal_received');
 return receipt;
end $$;
revoke all on function public.appointment_accept_payment_terms(uuid,uuid,text,boolean),public.appointment_withdraw(uuid,uuid) from public,anon,authenticated;
grant execute on function public.appointment_accept_payment_terms(uuid,uuid,text,boolean),public.appointment_withdraw(uuid,uuid) to service_role;

create or replace function public.appointment_enqueue(p_id uuid,p_event text,p_url text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments; cfg jsonb; snapshot jsonb; key text;
begin
 select * into strict b from public.appointments where id=p_id;
 if b.kind<>'booking' or b.email is null then return; end if;
 select config into cfg from public.appointment_settings where id=1;
 snapshot:=(to_jsonb(b)-'manage_hash'-'request_id')||jsonb_build_object('manageUrl',p_url,'contactEmail',cfg->>'email','contactPhone',cfg->>'phone');
 key:=p_id::text||':'||p_event||':'||extract(epoch from b.updated_at)::text;
 if p_event='reminder' then key:=p_id::text||':reminder:'||extract(epoch from b.starts_at)::text; end if;
 insert into public.appointment_mail(appointment_id,event_key,event,audience,payload) values(p_id,key||':client',p_event,'client',snapshot) on conflict(event_key) do nothing;
 if p_event in ('requested','cancelled','payment_received','withdrawal_received') and coalesce(cfg->>'email','')<>'' then
  insert into public.appointment_mail(appointment_id,event_key,event,audience,payload) values(p_id,key||':owner',p_event,'owner',snapshot) on conflict(event_key) do nothing;
 end if;
end $$;
