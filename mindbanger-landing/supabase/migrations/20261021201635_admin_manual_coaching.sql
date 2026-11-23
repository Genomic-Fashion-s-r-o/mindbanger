-- Admin-only contacts. They never imply verified email, account terms or marketing consent.
create table public.coaching_manual_contacts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null check(length(first_name) between 1 and 60),
 last_name text not null check(length(last_name) between 1 and 60),
 phone text not null default '' check(length(phone)<=40),
 city text not null default '' check(length(city)<=100),
 country text not null check(country in('SK','CZ','other')),
 actor uuid not null, created_at timestamptz not null default now()
);
alter table public.coaching_manual_contacts enable row level security;
revoke all on public.coaching_manual_contacts from public,anon,authenticated;
grant select,insert on public.coaching_manual_contacts to service_role;

create function public.coaching_manual_lookup(p_email text) returns uuid language sql stable security definer set search_path='' as $$
 select id from auth.users where lower(email)=lower(btrim(p_email)) and deleted_at is null limit 1
$$;
create function public.coaching_manual_enroll(p_user uuid,p_contact jsonb,p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_actor is null or p_user is null or length(btrim(p_contact->>'firstName')) not between 1 and 60 or length(btrim(p_contact->>'lastName')) not between 1 and 60 then raise exception 'invalid_contact';end if;
 insert into public.coaching_manual_contacts(user_id,first_name,last_name,phone,city,country,actor)
 values(p_user,btrim(p_contact->>'firstName'),btrim(p_contact->>'lastName'),coalesce(p_contact->>'phone',''),coalesce(p_contact->>'city',''),p_contact->>'country',p_actor)
 on conflict(user_id) do nothing;
 insert into public.coaching_client_cards(user_id,actor) values(p_user,p_actor::text) on conflict(user_id) do nothing;
 insert into public.coaching_card_audit(user_id,actor,action) values(p_user,p_actor,'manual_contact_enrolled');
end $$;

alter table public.appointments drop constraint appointments_funding_type_check;
alter table public.appointments add constraint appointments_funding_type_check check(funding_type in('card','package','manual'));
alter table public.appointments add constraint appointment_manual_no_stripe check(funding_type<>'manual' or
 (not paid and stripe_session_id is null and payment_intent_id is null and entitlement_id is null and package_offer_id is null and payment_due_at is null and contract_at is null and hold_until is null));

create function public.appointment_admin_manual(p_user uuid,p_service text,p_start timestamptz,p_price numeric,p_note text,p_request uuid,p_actor uuid,p_participant text default '',p_age integer default 0,p_guardian boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
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
 mins:=(svc->>'minutes')::integer;gap:=greatest(10,coalesce((cfg->>'bufferMinutes')::integer,10));
 if svc is null or mins not in(50,80) then raise exception 'invalid_service';end if;
 if p_age<>0 or p_participant<>'' or p_guardian then
  if p_service<>'teenager-pod-tlakom' or p_age not between 13 and 17 or length(btrim(p_participant))<2 or p_guardian is distinct from true then raise exception 'guardian_required';end if;
 end if;
 perform public.appointment_expire();
 insert into public.coaching_client_cards(user_id,actor) values(p_user,p_actor::text) on conflict(user_id) do nothing;
 insert into public.appointments(request_id,user_id,kind,status,starts_at,ends_at,busy_until,service_id,service_name,price,location,customer_name,email,phone,customer_first_name,customer_last_name,customer_city,customer_country,catalog_version,funding_type,payment_flow,payment_state,paid,topic_note,participant_name,participant_age,guardian_consent_at)
 values(p_request,p_user,'booking','confirmed',p_start,p_start+make_interval(mins=>mins),p_start+make_interval(mins=>mins+gap),p_service,svc->>'name',p_price,'Online · Google Meet',case when c.user_id is not null then c.first_name||' '||c.last_name else person.name end,person.email,coalesce(c.phone,''),c.first_name,c.last_name,c.city,c.country,2,'manual','authorize_confirm','released',false,coalesce(p_note,''),nullif(p_participant,''),nullif(p_age,0),case when p_guardian then now() else null end) returning id into result;
 -- INSERT has no video trigger: enqueue explicitly, once, in this transaction.
 update public.appointments set meeting_state='pending' where id=result;
 insert into public.appointment_video_jobs(appointment_id) values(result);
 insert into public.appointment_audit(appointment_id,actor,action) values(result,p_actor::text,'manual_booked_no_stripe');
 return result;
end $$;

alter function public.appointment_change(uuid,text,text,timestamptz,text) rename to appointment_change_before_manual;
create function public.appointment_change(p_id uuid,p_action text,p_actor text,p_start timestamptz default null,p_hash text default null) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id for update;
 if b.funding_type<>'manual' then perform public.appointment_change_before_manual(p_id,p_action,p_actor,p_start,p_hash);return;end if;
 if p_actor is null or p_actor='' or (p_actor='client' and (p_hash is null or b.manage_hash is distinct from p_hash or p_action<>'cancel' or b.starts_at<=now())) then raise exception 'invalid_transition';end if;
 if p_action='cancel' and b.status='cancelled' then return;end if;
 if p_action='move' and p_actor<>'client' and b.status='confirmed' then
  if p_start is null or p_start<=now() or p_start>now()+interval '2 years' then raise exception 'invalid_slot';end if;
  perform public.appointment_expire();
  update public.appointments set starts_at=p_start,ends_at=p_start+(b.ends_at-b.starts_at),busy_until=p_start+(b.busy_until-b.starts_at),updated_at=now() where id=p_id;
 elsif p_action='cancel' and b.status='confirmed' then
  update public.appointments set status='cancelled',updated_at=now() where id=p_id;
  perform public.appointment_enqueue(p_id,'cancelled');
 elsif p_action in('complete','no_show') and p_actor<>'client' and b.status='confirmed' and b.starts_at<=now() then
  update public.appointments set status=case when p_action='complete' then 'completed' else 'no_show' end,updated_at=now() where id=p_id;
 else raise exception 'invalid_transition';end if;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,'manual_'||p_action);
end $$;

-- Checkout must reject a manual booking before a Stripe session can be created.
alter function public.appointment_prepare_payment(uuid,uuid) rename to appointment_prepare_payment_before_manual;
create function public.appointment_prepare_payment(p_id uuid,p_user uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(710071);
 if exists(select 1 from public.appointments where id=p_id and funding_type='manual') then raise exception 'payment_unavailable';end if;
 return public.appointment_prepare_payment_before_manual(p_id,p_user);
end $$;

do $$declare f record;begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('coaching_manual_lookup','coaching_manual_enroll','appointment_admin_manual','appointment_change','appointment_change_before_manual','appointment_prepare_payment','appointment_prepare_payment_before_manual') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.sig);
  execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
-- PRESERVED FUNCTIONS WITH MANUAL BRANCH
create or replace function public.appointment_payment_snapshot() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cfg jsonb;
begin
 if new.funding_type='manual' then new.payment_due_at:=null;return new;end if;
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

create or replace function public.appointment_queue_video() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.payment_flow='authorize_confirm' or new.funding_type='manual') and new.status in ('confirmed','cancelled','expired') and ((new.status='confirmed' and (new.paid or new.funding_type='manual')) or new.meeting_event_id is not null) then
  if new.status in ('cancelled','expired') or (not new.paid and new.funding_type<>'manual') then new.meeting_state:='cancelling';new.meeting_url:=null;
  else new.meeting_state:='pending';end if;
  insert into public.appointment_video_jobs(appointment_id,revision,available_at) values(new.id,now(),now()) on conflict(appointment_id) do update set revision=excluded.revision,available_at=now(),attempts=0;
 end if;
 return new;
end $$;

create or replace function public.appointment_finish_video(p_id uuid,p_lease uuid,p_revision timestamptz,p_event text,p_url text,p_cancelled boolean) returns void language plpgsql security invoker set search_path='' as $$
declare job public.appointment_video_jobs; b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into job from public.appointment_video_jobs where appointment_id=p_id for update;
 if not found or job.lease is distinct from p_lease then return;end if;
 select * into strict b from public.appointments where id=p_id for update;
 if job.revision is distinct from p_revision then
  update public.appointment_video_jobs set lease=null,lease_until=null,available_at=now() where appointment_id=p_id;return;
 end if;
 if p_cancelled then update public.appointments set meeting_url=null,meeting_state='cancelled' where id=p_id;
 elsif b.status='confirmed' and (b.paid or b.funding_type='manual') and p_url is not null and p_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' then
  update public.appointments set meeting_url=p_url,meeting_event_id=p_event,meeting_state='ready',updated_at=now() where id=p_id;
  perform public.appointment_enqueue(p_id,'confirmed');
 else raise exception 'video_state_changed';end if;
 delete from public.appointment_video_jobs where appointment_id=p_id;
end $$;

create or replace function public.coaching_clients(p_query text default '',p_offset integer default 0) returns jsonb language sql stable security definer set search_path='' as $$
 -- Only service_role may execute: directory needs the auth email without granting auth.users access.
 with clients as (
 select u.id,u.email,coalesce(nullif(cc.display_name,''),nullif(p.full_name,''),nullif(mc.first_name||' '||mc.last_name,''),a.customer_name,u.email) name,coalesce(nullif(p.full_name,''),nullif(mc.first_name||' '||mc.last_name,''),a.customer_name,u.email) account_name,
 coalesce(nullif(a.phone,''),mc.phone) phone,coalesce(nullif(a.customer_city,''),mc.city) city,coalesce(nullif(a.customer_country,''),mc.country) country,
 (select count(*) from public.coaching_client_records r where r.user_id=u.id and r.review_after<=now()) review_due,
 (select min(b.starts_at) from public.appointments b where b.user_id=u.id and b.kind='booking' and b.status in('pending','confirmed') and b.starts_at>now() and(b.status<>'pending' or b.hold_until is null or b.hold_until>now())) next_at
 from auth.users u left join public.profiles p on p.id=u.id left join public.coaching_client_cards cc on cc.user_id=u.id left join public.coaching_manual_contacts mc on mc.user_id=u.id
 left join lateral(select * from public.appointments b where b.user_id=u.id and b.kind='booking' order by b.created_at desc limit 1) a on true
 where (a.id is not null or exists(select 1 from public.coaching_client_cards c where c.user_id=u.id))
 and (strpos(lower(coalesce(u.email,'')),lower(left(p_query,100)))>0 or strpos(lower(coalesce(cc.display_name,'')||' '||coalesce(p.full_name,'')||' '||coalesce(mc.first_name,'')||' '||coalesce(mc.last_name,'')||' '||coalesce(a.customer_name,'')),lower(left(p_query,100)))>0)
 ) select jsonb_build_object('total',(select count(*) from clients),'clients',coalesce((select jsonb_agg(to_jsonb(c)) from(select * from clients order by lower(name),id limit 50 offset greatest(0,least(p_offset,50000))) c),'[]'::jsonb))
$$;
revoke all on function public.coaching_clients(text,integer) from public,anon,authenticated;
grant execute on function public.coaching_clients(text,integer) to service_role;


create or replace function public.appointment_admin_clients(p_query text,p_version text)
returns table(id uuid,name text,email text,ready boolean)
language sql stable security invoker set search_path='' as $$
 select u.id,coalesce(nullif(p.full_name,''),mc.first_name||' '||mc.last_name),u.email::text,
   (u.email_confirmed_at is not null and length(trim(coalesce(p.full_name,'')))>=2 and exists(select 1 from public.client_consents c where c.user_id=u.id and c.version=p_version))
 from auth.users u left join public.profiles p on p.id=u.id left join public.coaching_manual_contacts mc on mc.user_id=u.id
 where length(trim(p_query)) between 2 and 80
 and (strpos(lower(coalesce(u.email,'')),lower(trim(p_query)))>0 or strpos(lower(coalesce(p.full_name,'')||' '||coalesce(mc.first_name,'')||' '||coalesce(mc.last_name,'')),lower(trim(p_query)))>0)
 order by lower(coalesce(p.full_name,u.email)),u.id limit 20
$$;

