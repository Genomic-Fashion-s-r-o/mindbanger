-- New bookings opt in only after explicit rollout; historical payments retain their flow.
alter table public.appointments
 add column payment_flow text not null default 'confirm_then_pay' check(payment_flow in ('confirm_then_pay','authorize_confirm')),
 add column payment_state text not null default 'awaiting_checkout' check(payment_state in ('awaiting_checkout','authorized','capturing','captured','cancelling','released')),
 add column authorization_expires_at timestamptz,
 add column capture_requested_at timestamptz,
 add column meeting_url text,
 add column meeting_event_id text,
 add column meeting_state text not null default 'none' check(meeting_state in ('none','pending','ready','cancelling','cancelled'));
alter table public.appointments add constraint appointment_meet_url check(meeting_url is null or meeting_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$');

create table public.appointment_video_jobs(
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 revision timestamptz not null default now(), available_at timestamptz not null default now(),
 lease uuid, lease_until timestamptz, attempts integer not null default 0
);
alter table public.appointment_video_jobs enable row level security;
revoke all on public.appointment_video_jobs from public,anon,authenticated;
grant all on public.appointment_video_jobs to service_role;

create table public.appointment_google_connection(
 id integer primary key check(id=1), owner_email text not null,
 encrypted_refresh_token text not null, scope text not null,
 updated_at timestamptz not null default now()
);
alter table public.appointment_google_connection enable row level security;
revoke all on public.appointment_google_connection from public,anon,authenticated;
grant all on public.appointment_google_connection to service_role;

-- Keep the old snapshot trigger for legacy records; manual capture has no client payment deadline.
alter function public.appointment_payment_snapshot() rename to appointment_payment_snapshot_legacy;
create function public.appointment_payment_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cfg jsonb;
begin
 if new.payment_flow='authorize_confirm' then
  new.payment_due_at:=null;
  if tg_op='UPDATE' and new.paid and not old.paid and old.contract_at is null then new.contract_at:=now(); end if;
  if new.status='confirmed' and not new.paid and not new.payment_refunded then raise exception 'stripe_capture_required'; end if;
  return new;
 end if;
 -- This body preserves the legacy policy snapshot and deadline behavior.
 if new.kind<>'booking' or new.service_id<>'individualny-coaching' then return new; end if;
 if tg_op='INSERT' then
  select config into strict cfg from public.appointment_settings where id=1;
  new.payment_terms:=jsonb_build_object('version','2026-10-19-payment-v1','paymentHours',coalesce((cfg->>'paymentHours')::integer,24),'cancellationHours',coalesce((cfg->>'cancellationHours')::integer,24),'lateCancellation',coalesce(cfg->>'lateCancellation','refund'),'provider',cfg->>'provider','companyId',cfg->>'companyId','registeredAddress',cfg->>'registeredAddress','registration',cfg->>'registration','email',cfg->>'email','phone',cfg->>'phone');
 end if;
 if new.status='confirmed' and (tg_op='INSERT' or old.status='pending') then
  if new.starts_at<=now()+interval '65 minutes' then raise exception 'confirmation_too_late'; end if;
  if new.payment_terms is null then raise exception 'payment_terms_missing'; end if;
  new.payment_due_at:=least(now()+make_interval(hours=>(new.payment_terms->>'paymentHours')::integer),new.starts_at-interval '30 minutes');
 end if;
 if tg_op='UPDATE' then
  if new.starts_at is distinct from old.starts_at and old.status='confirmed' and not old.paid and old.payment_due_at is not null then
   if old.stripe_session_id is not null then raise exception 'checkout_move_requires_cancel'; end if;
   new.payment_due_at:=least(old.payment_due_at,new.starts_at-interval '30 minutes');
   if new.payment_due_at<=now()+interval '31 minutes' then raise exception 'confirmation_too_late'; end if;
  end if;
  if new.paid and not old.paid and old.contract_at is null then new.contract_at:=now(); end if;
 end if;
 return new;
end $$;
drop trigger appointment_payment_snapshot on public.appointments;
create trigger appointment_payment_snapshot before insert or update of status,starts_at,paid on public.appointments for each row execute function public.appointment_payment_snapshot();

alter function public.appointment_create_coaching(uuid,timestamptz,text,text,text,text,uuid,text,text,text,text,boolean) rename to appointment_create_coaching_legacy;
create function public.appointment_create_coaching(p_user uuid,p_start timestamptz,p_name text,p_email text,p_phone text,p_hash text,p_request_id uuid,p_manage_url text,p_legal_version text,p_topic text,p_note text,p_adult boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare cfg jsonb; result uuid; existing boolean;
begin
 perform pg_advisory_xact_lock(710071);
 select exists(select 1 from public.appointments where request_id=p_request_id) into existing;
 result:=public.appointment_create_coaching_legacy(p_user,p_start,p_name,p_email,p_phone,p_hash,p_request_id,p_manage_url,p_legal_version,p_topic,p_note,p_adult);
 select config into cfg from public.appointment_settings where id=1;
 if not existing and cfg->>'paymentMode'='authorize_confirm' then
  update public.appointments set payment_flow='authorize_confirm',hold_until=least(now()+interval '45 minutes',starts_at-interval '30 minutes'),payment_terms=payment_terms||jsonb_build_object('version','2026-10-19-authorization-v1','paymentFlow','authorize_confirm') where id=result;
  delete from public.appointment_mail where appointment_id=result and state='queued';
  perform public.appointment_enqueue(result,'requested',p_manage_url);
 end if;
 return result;
end $$;

create or replace function public.appointment_expire() returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);
 for b in update public.appointments set status='expired',updated_at=now() where status='pending' and hold_until<=now() and (payment_flow='confirm_then_pay' or (payment_state='awaiting_checkout' and stripe_session_id is null)) returning * loop
  perform public.appointment_enqueue(b.id,'expired');
 end loop;
end $$;

alter function public.appointment_prepare_payment(uuid,uuid) rename to appointment_prepare_payment_legacy;
create function public.appointment_prepare_payment(p_id uuid,p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.appointments; cfg jsonb;
begin
 perform pg_advisory_xact_lock(710071);
 select * into b from public.appointments where id=p_id and user_id=p_user and kind='booking' for update;
 if not found or p_user is null then raise exception 'payment_unavailable'; end if;
 if b.payment_flow='confirm_then_pay' then return public.appointment_prepare_payment_legacy(p_id,p_user); end if;
 select config into cfg from public.appointment_settings where id=1;
 if not coalesce((cfg->>'stripeEnabled')::boolean,false) or b.status<>'pending' or b.payment_state<>'awaiting_checkout' or b.paid or b.payment_review or b.hold_until<=now() or b.starts_at<=now() then raise exception 'payment_unavailable'; end if;
 return jsonb_build_object('id',b.id,'price',b.price,'email',b.email,'stripe_session_id',b.stripe_session_id,'starts_at',b.starts_at,'attempt',b.checkout_attempt,'payment_due_at',b.hold_until,'payment_terms',b.payment_terms,'payment_flow',b.payment_flow);
end $$;

alter function public.appointment_accept_payment_terms(uuid,uuid,text,boolean) rename to appointment_accept_payment_terms_legacy;
create function public.appointment_accept_payment_terms(p_id uuid,p_user uuid,p_version text,p_early boolean) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);perform public.appointment_prepare_payment(p_id,p_user);
 select * into strict b from public.appointments where id=p_id for update;
 if b.payment_flow='confirm_then_pay' then perform public.appointment_accept_payment_terms_legacy(p_id,p_user,p_version,p_early);return;end if;
 if p_version is distinct from '2026-10-19-authorization-v1' or b.payment_terms->>'version' is distinct from p_version or p_early is null or (b.starts_at<now()+interval '22 days' and not p_early) then raise exception 'invalid_payment_terms';end if;
 update public.appointments set checkout_terms_version=p_version,checkout_terms_at=now(),early_service_consent=p_early where id=p_id;
end $$;

alter function public.appointment_attach_checkout(uuid,uuid,text) rename to appointment_attach_checkout_legacy;
create function public.appointment_attach_checkout(p_id uuid,p_user uuid,p_session text) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);
 select * into b from public.appointments where id=p_id and user_id=p_user for update;
 if b.payment_flow='confirm_then_pay' then perform public.appointment_attach_checkout_legacy(p_id,p_user,p_session);return;end if;
 perform public.appointment_prepare_payment(p_id,p_user);
 if b.checkout_terms_at is null or b.checkout_terms_version is distinct from b.payment_terms->>'version' or (b.stripe_session_id is not null and b.stripe_session_id<>p_session) then raise exception 'payment_unavailable';end if;
 update public.appointments set stripe_session_id=p_session where id=p_id;
end $$;

-- Authorizations reserve the slot but never set paid=true.
create function public.appointment_record_authorization(p_id uuid,p_intent text,p_amount integer,p_currency text,p_expires timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id and payment_flow='authorize_confirm' for update;
 if p_intent is null or p_amount is distinct from (b.price*100)::integer or p_currency is distinct from 'eur' or p_expires is null or p_expires<=now() or (b.payment_intent_id is not null and b.payment_intent_id<>p_intent) then raise exception 'payment_mismatch';end if;
 if b.payment_state in ('authorized','capturing','captured','released','cancelling') then return;end if;
 if b.status<>'pending' or b.hold_until<=now() or b.starts_at<=now()+interval '30 minutes' then
  update public.appointments set status='cancelled',payment_state='cancelling',payment_intent_id=p_intent,authorization_expires_at=p_expires,updated_at=now() where id=p_id;
  return;
 end if;
 update public.appointments set payment_state='authorized',payment_intent_id=p_intent,authorization_expires_at=least(p_expires,starts_at-interval '30 minutes'),hold_until=null,updated_at=now() where id=p_id;
 perform public.appointment_enqueue(p_id,'authorized');
end $$;

create function public.appointment_claim_capture(p_id uuid,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id and payment_flow='authorize_confirm' for update;
 if b.paid and b.status='confirmed' then return jsonb_build_object('intent',b.payment_intent_id,'paid',true);end if;
 if b.status<>'pending' or b.payment_state not in ('authorized','capturing') or b.authorization_expires_at<=now()+interval '2 minutes' or b.starts_at<=now()+interval '30 minutes' or (b.starts_at<now()+interval '14 days' and not b.early_service_consent) then raise exception 'capture_unavailable';end if;
 update public.appointments set payment_state='capturing',capture_requested_at=coalesce(capture_requested_at,now()),updated_at=now() where id=p_id;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,'capture_requested');
 return jsonb_build_object('intent',b.payment_intent_id,'paid',false);
end $$;

create function public.appointment_record_capture(p_id uuid,p_intent text,p_amount integer,p_currency text) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments; valid boolean;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id and payment_flow='authorize_confirm' for update;
 if b.payment_intent_id is distinct from p_intent or p_amount is distinct from (b.price*100)::integer or p_currency is distinct from 'eur' then raise exception 'payment_mismatch';end if;
 if b.payment_refunded or b.paid then return;end if;
 valid:=b.status='pending' and b.payment_state in ('authorized','capturing') and b.starts_at>now();
 update public.appointments set paid=true,payment_state='captured',status=case when valid then 'confirmed' else 'cancelled' end,payment_review=not valid,hold_until=null,updated_at=now() where id=p_id;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,'stripe','payment_verified');
 perform public.appointment_enqueue(p_id,'payment_received');
end $$;

create function public.appointment_release_authorization(p_id uuid,p_intent text) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id and payment_flow='authorize_confirm' for update;
 if b.payment_intent_id is not null and b.payment_intent_id is distinct from p_intent then raise exception 'payment_mismatch';end if;
 if b.paid or b.payment_state='released' then return;end if;
 update public.appointments set status=case when status='expired' then status else 'cancelled' end,payment_state='released',hold_until=null,updated_at=now() where id=p_id;
 perform public.appointment_enqueue(p_id,'cancelled');
end $$;

alter function public.appointment_change(uuid,text,text,timestamptz,text) rename to appointment_change_legacy;
create function public.appointment_change(p_id uuid,p_action text,p_actor text,p_start timestamptz default null,p_hash text default null) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id for update;
 if b.payment_flow='authorize_confirm' then
  if p_actor='client' and (p_hash is null or b.manage_hash is distinct from p_hash or p_action<>'cancel') then raise exception 'invalid_transition';end if;
  if p_action='confirm' then raise exception 'stripe_capture_required';end if;
  if p_action='move' and not b.paid then raise exception 'authorization_move_requires_cancel';end if;
  if p_action='cancel' and b.payment_state='capturing' then raise exception 'capture_in_progress';end if;
  if p_action='cancel' and not b.paid and b.status='pending' and (b.payment_intent_id is not null or b.stripe_session_id is not null) then
   update public.appointments set payment_state='cancelling',hold_until=null,updated_at=now() where id=p_id;return;
  end if;
 end if;
 perform public.appointment_change_legacy(p_id,p_action,p_actor,p_start,p_hash);
end $$;

-- Video changes are durable; per-booking deterministic Google event IDs prevent duplicates.
create function public.appointment_queue_video() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.payment_flow='authorize_confirm' and new.status in ('confirmed','cancelled','expired') and ((new.status='confirmed' and new.paid) or new.meeting_event_id is not null) then
  if new.status in ('cancelled','expired') or not new.paid then new.meeting_state:='cancelling';new.meeting_url:=null;
  else new.meeting_state:='pending';end if;
  insert into public.appointment_video_jobs(appointment_id,revision,available_at) values(new.id,now(),now()) on conflict(appointment_id) do update set revision=excluded.revision,available_at=now(),attempts=0;
 end if;
 return new;
end $$;
create trigger appointment_queue_video before update of paid,status,starts_at on public.appointments for each row execute function public.appointment_queue_video();

create function public.appointment_claim_video() returns jsonb language plpgsql security invoker set search_path='' as $$
declare job public.appointment_video_jobs; b public.appointments; nonce uuid:=gen_random_uuid();
begin
 select * into job from public.appointment_video_jobs where available_at<=now() and (lease_until is null or lease_until<now()) order by available_at limit 1 for update skip locked;
 if not found then return null;end if;
 select * into strict b from public.appointments where id=job.appointment_id;
 update public.appointment_video_jobs set lease=nonce,lease_until=now()+interval '2 minutes',attempts=attempts+1 where appointment_id=b.id;
 return jsonb_build_object('booking',to_jsonb(b)-'manage_hash'-'request_id','lease',nonce,'revision',job.revision);
end $$;

create function public.appointment_finish_video(p_id uuid,p_lease uuid,p_revision timestamptz,p_event text,p_url text,p_cancelled boolean) returns void language plpgsql security invoker set search_path='' as $$
declare job public.appointment_video_jobs; b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into job from public.appointment_video_jobs where appointment_id=p_id for update;
 if not found or job.lease is distinct from p_lease then return;end if;
 select * into strict b from public.appointments where id=p_id for update;
 if job.revision is distinct from p_revision then
  update public.appointment_video_jobs set lease=null,lease_until=null,available_at=now() where appointment_id=p_id;return;
 end if;
 if p_cancelled then update public.appointments set meeting_url=null,meeting_state='cancelled' where id=p_id;
 elsif b.status='confirmed' and b.paid and p_url is not null and p_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
  update public.appointments set meeting_url=p_url,meeting_event_id=p_event,meeting_state='ready',updated_at=now() where id=p_id;
  perform public.appointment_enqueue(p_id,'confirmed');
 else raise exception 'video_state_changed';end if;
 delete from public.appointment_video_jobs where appointment_id=p_id;
end $$;

create or replace function public.appointment_enqueue(p_id uuid,p_event text,p_url text default null) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments; cfg jsonb; snapshot jsonb; key text;
begin
 select * into strict b from public.appointments where id=p_id;if b.kind<>'booking' or b.email is null then return;end if;
 select config into cfg from public.appointment_settings where id=1;
 snapshot:=(to_jsonb(b)-'manage_hash'-'request_id')||jsonb_build_object('manageUrl',p_url,'contactEmail',cfg->>'email','contactPhone',cfg->>'phone');
 key:=p_id::text||':'||p_event||':'||extract(epoch from b.updated_at)::text;
 if p_event='reminder' then key:=p_id::text||':reminder:'||extract(epoch from b.starts_at)::text;end if;
 insert into public.appointment_mail(appointment_id,event_key,event,audience,payload) values(p_id,key||':client',p_event,'client',snapshot) on conflict(event_key) do nothing;
 if p_event in ('requested','authorized','confirmed','cancelled','payment_received','withdrawal_received') and coalesce(cfg->>'email','')<>'' and not(p_event='requested' and b.payment_flow='authorize_confirm') then
  insert into public.appointment_mail(appointment_id,event_key,event,audience,payload) values(p_id,key||':owner',p_event,'owner',snapshot) on conflict(event_key) do nothing;
 end if;
end $$;

create function public.appointment_capture_retryable(p_id uuid,p_intent text) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(710071);
 update public.appointments set payment_state='authorized',capture_requested_at=null,updated_at=now() where id=p_id and payment_intent_id=p_intent and payment_state='capturing' and capture_requested_at<now()-interval '5 minutes' and not paid;
end $$;

alter function public.appointment_reset_checkout(uuid,uuid,text) rename to appointment_reset_checkout_legacy;
create function public.appointment_reset_checkout(p_id uuid,p_user uuid,p_session text) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into b from public.appointments where id=p_id and user_id=p_user for update;
 if b.payment_flow='confirm_then_pay' then perform public.appointment_reset_checkout_legacy(p_id,p_user,p_session);return;end if;
 if b.status<>'pending' or b.payment_state<>'awaiting_checkout' or b.stripe_session_id is distinct from p_session or b.hold_until<=now() then raise exception 'payment_unavailable';end if;
 update public.appointments set stripe_session_id=null,checkout_attempt=checkout_attempt+1 where id=p_id;
end $$;

alter function public.appointment_admin_assign(uuid,timestamptz,text,text,uuid,text,text,text,text,boolean,text) rename to appointment_admin_assign_legacy;
create function public.appointment_admin_assign(p_user uuid,p_start timestamptz,p_topic text,p_note text,p_request_id uuid,p_hash text,p_manage_url text,p_legal_version text,p_client_version text,p_confirm boolean,p_actor text) returns uuid language plpgsql security invoker set search_path='' as $$
declare cfg jsonb; result uuid; existing boolean;
begin
 perform pg_advisory_xact_lock(710071);select config into cfg from public.appointment_settings where id=1;
 select exists(select 1 from public.appointments where request_id=p_request_id) into existing;
 result:=public.appointment_admin_assign_legacy(p_user,p_start,p_topic,p_note,p_request_id,p_hash,p_manage_url,p_legal_version,p_client_version,case when cfg->>'paymentMode'='authorize_confirm' then false else p_confirm end,p_actor);
 if not existing and cfg->>'paymentMode'='authorize_confirm' then
  update public.appointments set payment_flow='authorize_confirm',hold_until=least(now()+interval '45 minutes',starts_at-interval '30 minutes'),payment_terms=payment_terms||jsonb_build_object('version','2026-10-19-authorization-v1','paymentFlow','authorize_confirm') where id=result;
  delete from public.appointment_mail where appointment_id=result and state='queued';perform public.appointment_enqueue(result,'requested',p_manage_url);
 end if;
 return result;
end $$;

-- Every new callable function is private to the server role.
do $$ declare fn record;begin
 for fn in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('appointment_payment_snapshot','appointment_create_coaching','appointment_prepare_payment','appointment_accept_payment_terms','appointment_attach_checkout','appointment_record_authorization','appointment_claim_capture','appointment_record_capture','appointment_release_authorization','appointment_change','appointment_queue_video','appointment_claim_video','appointment_finish_video','appointment_capture_retryable','appointment_reset_checkout','appointment_admin_assign') loop
  execute format('revoke all on function %s from public,anon,authenticated',fn.sig);execute format('grant execute on function %s to service_role',fn.sig);
 end loop;
end $$;
