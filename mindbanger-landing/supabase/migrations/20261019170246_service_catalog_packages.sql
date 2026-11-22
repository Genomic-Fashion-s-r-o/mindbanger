-- Additive rollout: historical prices/durations and identities are never rewritten.
alter table public.appointments add column catalog_version integer not null default 1,
 add column funding_type text not null default 'card' check(funding_type in ('card','package')),
 add column package_offer_id text,add column package_snapshot jsonb,add column entitlement_id uuid,
 add column participant_name text,add column participant_age integer,add column guardian_consent_at timestamptz;
alter table public.appointments add constraint appointment_minor_guard check(participant_age is null or(participant_age between 13 and 17 and length(participant_name)>=2 and guardian_consent_at is not null));
create table public.appointment_packages(
 id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,purchase_appointment_id uuid not null unique references public.appointments(id),
 offer_id text not null,service_id text not null,snapshot jsonb not null,total integer not null check(total between 2 and 20),
 state text not null default 'active' check(state in ('active','suspended')),created_at timestamptz not null default now()
);
alter table public.appointments add foreign key(entitlement_id) references public.appointment_packages(id);
create table public.appointment_package_sessions(
 appointment_id uuid primary key references public.appointments(id),package_id uuid not null references public.appointment_packages(id),
 state text not null default 'reserved' check(state in ('reserved','used','released','review')),updated_at timestamptz not null default now()
);
create index on public.appointment_package_sessions(package_id,state);
create function public.appointment_create_catalog(p_user uuid,p_service text,p_start timestamptz,p_name text,p_email text,p_phone text,p_hash text,p_request_id uuid,p_manage_url text,p_legal_version text,p_topic text,p_note text,p_adult boolean,p_package text default '',p_credit uuid default null,p_participant text default '',p_age integer default 0,p_guardian boolean default false,p_actor text default 'client')
returns uuid language plpgsql security invoker set search_path='' as $$
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
 if mins not in(50,80) or amount<=0 or amount>1000 then raise exception 'invalid_service';end if;
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
 policy:=jsonb_build_object('version','2026-10-19-authorization-v1','paymentFlow','authorize_confirm','paymentHours',24,'cancellationHours',(cfg->>'cancellationHours')::integer,'lateCancellation',cfg->>'lateCancellation','provider',cfg->>'provider','companyId',cfg->>'companyId','registeredAddress',cfg->>'registeredAddress','registration',cfg->>'registration','email',cfg->>'email','phone',cfg->>'phone','minutes',mins,'slotMinutes',mins+10,'serviceName',svc->>'name','package',offer);
 insert into public.appointments(request_id,user_id,status,starts_at,ends_at,busy_until,hold_until,service_id,service_name,price,location,customer_name,email,phone,manage_hash,legal_version,consent_at,topic,topic_note,payment_flow,payment_state,payment_terms,catalog_version,funding_type,paid,package_offer_id,package_snapshot,entitlement_id,participant_name,participant_age,guardian_consent_at)
 values(p_request_id,p_user,'pending',p_start,p_start+make_interval(mins=>mins),p_start+make_interval(mins=>mins+10),case when p_credit is null then least(now()+interval '45 minutes',p_start-interval '30 minutes') else null end,p_service,svc->>'name',amount,cfg->>'address',p_name,lower(p_email),p_phone,p_hash,p_legal_version,now(),p_topic,coalesce(p_note,''),'authorize_confirm',case when p_credit is null then 'awaiting_checkout' else 'captured' end,policy,2,case when p_credit is null then 'card' else 'package' end,p_credit is not null,nullif(p_package,''),offer,p_credit,nullif(p_participant,''),nullif(p_age,0),case when p_guardian then now() else null end) returning id into result;
 if p_credit is not null then insert into public.appointment_package_sessions(appointment_id,package_id) values(result,p_credit);end if;
 insert into public.appointment_audit(appointment_id,actor,action) values(result,p_actor,'catalog_requested');perform public.appointment_enqueue(result,'requested',p_manage_url);return result;
end $$;
create function public.appointment_package_update() returns trigger language plpgsql security invoker set search_path='' as $$
declare e uuid;
begin
 if new.package_offer_id is not null and new.paid and not old.paid and new.payment_intent_id is not null then
  insert into public.appointment_packages(user_id,purchase_appointment_id,offer_id,service_id,snapshot,total)
  values(new.user_id,new.id,new.package_offer_id,new.service_id,new.package_snapshot||jsonb_build_object('participantName',coalesce(new.participant_name,''),'participantAge',coalesce(new.participant_age,0)),(new.package_snapshot->>'sessions')::integer)
  on conflict(purchase_appointment_id) do nothing;
  select id into e from public.appointment_packages where purchase_appointment_id=new.id;
  insert into public.appointment_package_sessions(appointment_id,package_id) values(new.id,e) on conflict do nothing;
  update public.appointments set entitlement_id=e where id=new.id and entitlement_id is null;
 end if;
 if new.stripe_refunded_amount>old.stripe_refunded_amount and new.package_offer_id is not null then
  update public.appointment_packages set state='suspended' where purchase_appointment_id=new.id returning id into e;
  update public.appointments set status='cancelled',paid=false,payment_review=true,updated_at=now() where entitlement_id=e and id<>new.id and status in('pending','confirmed');
 end if;
 if new.status in('completed','no_show','cancelled','expired') then
  update public.appointment_package_sessions set state=case when new.status in('completed','no_show') then 'used' when new.status='expired' or new.starts_at>=now()+interval '24 hours' then 'released' else 'review' end,updated_at=now() where appointment_id=new.id and state='reserved';
 end if;
 return new;
end $$;
create trigger appointment_package_update after update of paid,status,stripe_refunded_amount on public.appointments for each row execute function public.appointment_package_update();
create function public.appointment_confirm_credit(p_id uuid,p_actor text) returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id and funding_type='package' for update;
 if b.status='confirmed' then return;end if;
 if b.status<>'pending' or not b.paid or b.starts_at<=now() or not exists(select 1 from public.appointment_packages where id=b.entitlement_id and state='active') then raise exception 'package_unavailable';end if;
 update public.appointments set status='confirmed',updated_at=now() where id=p_id;perform public.appointment_enqueue(p_id,'payment_received');insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,'package_confirmed');
end $$;
create function public.appointment_release_credit(p_id uuid,p_actor text) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(710071);
 update public.appointment_package_sessions set state='released',updated_at=now() where appointment_id=p_id and state='review';if not found then raise exception 'credit_not_in_review';end if;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,'package_credit_restored');
end $$;
create function public.appointment_admin_catalog(p_user uuid,p_service text,p_start timestamptz,p_topic text,p_note text,p_request_id uuid,p_hash text,p_manage_url text,p_legal_version text,p_client_version text,p_actor text,p_participant text default '',p_age integer default 0,p_guardian boolean default false) returns uuid language plpgsql security invoker set search_path='' as $$
declare client_name text;client_email text;
begin
 select p.full_name,u.email into client_name,client_email from auth.users u join public.profiles p on p.id=u.id where u.id=p_user and u.email_confirmed_at is not null and exists(select 1 from public.client_consents c where c.user_id=u.id and c.version=p_client_version);
 if client_email is null or length(trim(coalesce(client_name,'')))<2 then raise exception 'client_account_required';end if;
 if p_actor is null or p_actor='' then raise exception 'admin_required';end if;
 return public.appointment_create_catalog(p_user,p_service,p_start,client_name,client_email,'',p_hash,p_request_id,p_manage_url,p_legal_version,p_topic,p_note,true,'',null,p_participant,p_age,p_guardian,p_actor);
end $$;
do $$declare t text;fn record;begin
 foreach t in array array['appointment_packages','appointment_package_sessions'] loop
  execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
 for fn in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('appointment_create_catalog','appointment_package_update','appointment_confirm_credit','appointment_release_credit','appointment_admin_catalog') loop
  execute format('revoke all on function %s from public,anon,authenticated',fn.sig);execute format('grant execute on function %s to service_role',fn.sig);
 end loop;
end $$;




-- GENERATED CATALOG ADAPTATIONS
create or replace function public.appointment_sales_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare b public.appointments; cfg jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  if new.kind='booking' and tg_op='INSERT' and new.catalog_version=1 then
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
  update public.appointments set customer_name=null,email=null,phone=null,topic_note=null,manage_hash=null,request_id=null,participant_name=null,participant_age=null,guardian_consent_at=null where ends_at < now()-interval '1 year' and email is not null;
  delete from public.appointment_audit where created_at < now()-interval '1 year';
  return query update public.appointment_mail set state='sending',attempts=attempts+1,available_at=now()+interval '5 minutes'
    where id in (select id from public.appointment_mail where (state='queued' or (state='sending' and available_at<=now())) and available_at<=now() and attempts<5 order by created_at limit least(p_limit,20) for update skip locked)
    returning *;
end $$;
create or replace function public.appointment_save_settings(p_config jsonb, p_actor text)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_planner jsonb;
begin
  perform pg_advisory_xact_lock(710071);
  select config->'planner' into current_planner from public.appointment_settings where id=1 for update;
  if (p_config->>'bufferMinutes')::integer<10 or (p_config->>'slotMinutes')::integer not in(30,60) or exists(select 1 from jsonb_array_elements(p_config->'services') s where ((s->>'active')::boolean and((s->>'minutes')::integer not in(50,80) or(s->>'price')::numeric<=0 or(s->>'price')::numeric>1000))) then raise exception 'invalid_settings'; end if;
  update public.appointment_settings set config=(p_config-'planner') || case when current_planner is null then '{}'::jsonb else jsonb_build_object('planner',current_planner) end,updated_at=now() where id=1;
  insert into public.appointment_audit(actor,action) values(p_actor,'settings_updated');
end $$;
create or replace function public.appointment_claim_capture(p_id uuid,p_actor text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);select * into strict b from public.appointments where id=p_id and payment_flow='authorize_confirm' for update;
 if b.paid and b.status='confirmed' then return jsonb_build_object('intent',b.payment_intent_id,'paid',true,'amount',(b.price*100)::integer);end if;
 if b.status<>'pending' or b.payment_state not in ('authorized','capturing') or b.authorization_expires_at<=now()+interval '2 minutes' or b.starts_at<=now()+interval '30 minutes' or (b.starts_at<now()+interval '14 days' and not b.early_service_consent) then raise exception 'capture_unavailable';end if;
 update public.appointments set payment_state='capturing',capture_requested_at=coalesce(capture_requested_at,now()),updated_at=now() where id=p_id;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,p_actor,'capture_requested');
 return jsonb_build_object('intent',b.payment_intent_id,'paid',false,'amount',(b.price*100)::integer);
end $$;
create or replace function public.appointment_record_refund(p_id uuid,p_intent text,p_amount integer,p_refunded_amount integer,p_currency text)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);
 select * into strict b from public.appointments where id=p_id and kind='booking' for update;
 if p_intent is null or b.payment_intent_id is distinct from p_intent or p_currency is distinct from 'eur' or p_amount is distinct from (b.price*100)::integer or p_refunded_amount is null or p_refunded_amount<=0 or p_refunded_amount>p_amount then raise exception 'payment_mismatch'; end if;
 if p_refunded_amount<=b.stripe_refunded_amount then return; end if;
 if p_refunded_amount=p_amount then
  perform public.appointment_record_payment(p_id,b.stripe_session_id,p_intent,p_amount,p_currency,true);
 else
  insert into public.appointment_audit(appointment_id,actor,action) values(p_id,'stripe','payment_partial_refund');
 end if;
 update public.appointments set stripe_refunded_amount=p_refunded_amount,payment_review=true,updated_at=now() where id=p_id;
end $$;
create or replace function public.appointment_record_payment(p_id uuid,p_session text,p_intent text,p_amount integer,p_currency text,p_refunded boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;
begin
 perform pg_advisory_xact_lock(710071);
 select * into strict b from public.appointments where id=p_id and kind='booking' for update;
 if b.stripe_session_id is not null and b.stripe_session_id<>p_session then raise exception 'payment_mismatch'; end if;
 if p_amount<>(b.price*100)::integer or p_currency<>'eur' or p_intent is null then raise exception 'payment_mismatch'; end if;
 if b.payment_intent_id is not null and b.payment_intent_id<>p_intent then raise exception 'payment_mismatch'; end if;
 if b.payment_refunded then return; end if;
 if (b.paid and not p_refunded) or (p_refunded and not b.paid and b.payment_review) then return; end if;
 update public.appointments set stripe_session_id=p_session,payment_intent_id=p_intent,paid=not p_refunded,payment_refunded=p_refunded,payment_review=p_refunded or status<>'confirmed',updated_at=now() where id=p_id;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,'stripe',case when p_refunded then 'payment_refunded' else 'payment_verified' end);
 if not p_refunded then perform public.appointment_enqueue(p_id,'payment_received'); end if;
end $$;
create or replace function public.appointment_withdraw(p_id uuid,p_user uuid)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare b public.appointments; receipt timestamptz;
begin
 perform pg_advisory_xact_lock(710071);
 select * into b from public.appointments where id=p_id and user_id=p_user and kind='booking' and kind='booking' for update;
 if not found or p_user is null or b.contract_at is null then raise exception 'booking_not_found'; end if;
 if b.withdrawal_at is not null then return b.withdrawal_at; end if;
 receipt:=now();
 update public.appointments set withdrawal_at=receipt,payment_review=true,status=case when status in ('pending','confirmed') and starts_at>now() then 'cancelled' else status end,updated_at=receipt where id=p_id;
 insert into public.appointment_audit(appointment_id,actor,action) values(p_id,'client','withdrawal_received');
 perform public.appointment_enqueue(p_id,'withdrawal_received');
 return receipt;
end $$;
do $$declare c record;begin for c in select conname from pg_constraint where conrelid='public.appointment_documents'::regclass and contype='c' and pg_get_constraintdef(oid) like '%4900%' loop execute format('alter table public.appointment_documents drop constraint %I',c.conname);end loop;end $$;
alter table public.appointment_documents add constraint document_positive_invoice check((kind='invoice' and amount_cents>0 and original_id is null and refund_total=0) or(kind='credit' and amount_cents<0 and original_id is not null and refund_total>0));
alter table public.appointment_documents add constraint document_refund_range check(refund_total between 0 and 100000);
create or replace function public.appointment_issue_documents(p_id uuid,p_lease uuid,p_intent text,p_customer jsonb,p_paid_at timestamptz,p_refunded integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.appointment_document_jobs;d public.appointment_documents;cfg jsonb;snap jsonb;previous integer;
begin
 select * into strict j from public.appointment_document_jobs where appointment_id=p_id and lease=p_lease and lease_until>now() for update;
 if j.booking->>'payment_intent_id' is distinct from p_intent or (j.booking->>'price')::numeric<=0 or p_refunded is null or p_refunded<0 or p_refunded>((j.booking->>'price')::numeric*100)::integer or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise exception 'document_payment_mismatch';end if;
 select provider into strict cfg from public.appointment_document_settings where id=1;
 select * into d from public.appointment_documents where intent=p_intent and kind='invoice';
 if not found then
  if coalesce(p_customer->>'name','')='' or coalesce(j.booking->>'email','')='' then raise exception 'document_customer_missing';end if;
  snap:=jsonb_build_object('provider',cfg,'customer',p_customer||jsonb_build_object('email',j.booking->>'email'),'service','Coaching','startsAt',j.booking->>'starts_at','endsAt',j.booking->>'ends_at','paidAt',j.captured_at,'appointmentId',p_id,'intent',p_intent,'package',j.booking->'package_snapshot','serviceName',j.booking->>'service_name');
  insert into public.appointment_documents(appointment_id,intent,number,kind,amount_cents,snapshot) values(p_id,p_intent,public.appointment_document_number(),'invoice',((j.booking->>'price')::numeric*100)::integer,snap) returning * into d;
 end if;
 select coalesce(max(refund_total),0) into previous from public.appointment_documents where intent=p_intent and kind='credit';
 if p_refunded>previous then
  insert into public.appointment_documents(appointment_id,intent,number,kind,original_id,amount_cents,refund_total,snapshot)
  values(p_id,p_intent,public.appointment_document_number(),'credit',d.id,previous-p_refunded,p_refunded,d.snapshot||jsonb_build_object('originalNumber',d.number));
 end if;
 return(select coalesce(jsonb_agg(to_jsonb(x) order by x.issued_at,x.number),'[]') from public.appointment_documents x where x.intent=p_intent);
end $$;
create or replace function public.appointment_queue_document() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.kind='booking' and new.payment_intent_id is not null and ((new.paid and not old.paid) or new.stripe_refunded_amount>old.stripe_refunded_amount) then
  insert into public.appointment_document_jobs(appointment_id,booking) values(new.id,jsonb_build_object('id',new.id,'payment_intent_id',new.payment_intent_id,'price',new.price,'package_snapshot',new.package_snapshot,'service_name',new.service_name,'customer_name',new.customer_name,'email',new.email,'starts_at',new.starts_at,'ends_at',new.ends_at))
  on conflict(appointment_id) do update set revision=public.appointment_document_jobs.revision+1,available_at=now();
 end if;return new;
end $$;
update public.appointment_settings set config=config||jsonb_build_object('catalogVersion',2,'slotMinutes',30,'bufferMinutes',10,'services','[{"id":"vypni-hlavu","name":"Vypni hlavu","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Priestor na utriedenie myšlienok, spomalenie a hľadanie konkrétneho ďalšieho kroku."},{"id":"zvladaj-stres","name":"Zvládaj stres s väčším pokojom","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Pomenuj zdroje záťaže a nájdi praktické kroky, ktoré ti pomôžu zvládať každodenné situácie."},{"id":"znovu-si-ver","name":"Znovu si ver","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Preskúmaj svoje silné stránky, hranice a možnosti, o ktoré sa môžeš oprieť."},{"id":"individualny-coaching","name":"Nájdi svoj ďalší krok","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Ujasni si rozhodnutie, smer alebo zmenu a pomenuj zvládnuteľný ďalší krok."},{"id":"teenager-pod-tlakom","name":"Teenager pod tlakom","price":49,"minutes":50,"slotMinutes":60,"active":true,"guardian":true,"description":"Podporný nezdravotnícky rozhovor o tlaku, očakávaniach a každodenných výzvach. Pre vek 13–17 rezervuje zákonný zástupca."},{"id":"mentalny-trening","name":"Myseľ víťaza","price":69,"minutes":50,"slotMinutes":60,"active":true,"description":"Mentálna príprava na výkon, práca so sústredením a vlastnými cieľmi."},{"id":"relaxacia","name":"Hlboká relaxácia","price":45,"minutes":50,"slotMinutes":60,"active":true,"description":"Vedená relaxácia, priestor na spomalenie a nácvik uvoľnenia."},{"id":"premiovy-mentalny-koucing","name":"Prémiový mentálny koučing","price":99,"minutes":80,"slotMinutes":90,"active":true,"description":"Predĺžený priestor na dôkladné preskúmanie témy a prípravu konkrétneho postupu."}]'::jsonb||coalesce((select jsonb_agg(x||jsonb_build_object('active',false)) from jsonb_array_elements(config->'services') x where not exists(select 1 from jsonb_array_elements('[{"id":"vypni-hlavu","name":"Vypni hlavu","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Priestor na utriedenie myšlienok, spomalenie a hľadanie konkrétneho ďalšieho kroku."},{"id":"zvladaj-stres","name":"Zvládaj stres s väčším pokojom","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Pomenuj zdroje záťaže a nájdi praktické kroky, ktoré ti pomôžu zvládať každodenné situácie."},{"id":"znovu-si-ver","name":"Znovu si ver","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Preskúmaj svoje silné stránky, hranice a možnosti, o ktoré sa môžeš oprieť."},{"id":"individualny-coaching","name":"Nájdi svoj ďalší krok","price":49,"minutes":50,"slotMinutes":60,"active":true,"description":"Ujasni si rozhodnutie, smer alebo zmenu a pomenuj zvládnuteľný ďalší krok."},{"id":"teenager-pod-tlakom","name":"Teenager pod tlakom","price":49,"minutes":50,"slotMinutes":60,"active":true,"guardian":true,"description":"Podporný nezdravotnícky rozhovor o tlaku, očakávaniach a každodenných výzvach. Pre vek 13–17 rezervuje zákonný zástupca."},{"id":"mentalny-trening","name":"Myseľ víťaza","price":69,"minutes":50,"slotMinutes":60,"active":true,"description":"Mentálna príprava na výkon, práca so sústredením a vlastnými cieľmi."},{"id":"relaxacia","name":"Hlboká relaxácia","price":45,"minutes":50,"slotMinutes":60,"active":true,"description":"Vedená relaxácia, priestor na spomalenie a nácvik uvoľnenia."},{"id":"premiovy-mentalny-koucing","name":"Prémiový mentálny koučing","price":99,"minutes":80,"slotMinutes":90,"active":true,"description":"Predĺžený priestor na dôkladné preskúmanie témy a prípravu konkrétneho postupu."}]'::jsonb) n where n->>'id'=x->>'id')),'[]'::jsonb),'packages','[{"id":"program-zmena","name":"Program ZMENA","serviceId":"individualny-coaching","sessions":3,"price":164,"active":true,"extras":"Individuálne cvičenia","description":"3 koučovacie hodiny a individuálne cvičenia. Cena zahŕňa aj prácu s cvičeniami; nejde o množstevnú zľavu."},{"id":"program-transformacia","name":"Program TRANSFORMÁCIA","serviceId":"individualny-coaching","sessions":6,"price":299,"active":true,"extras":"Cvičenia a nahrávky","description":"6 koučovacích hodín, cvičenia a nahrávky. Cena zahŕňa dodatočné materiály; nejde iba o súčet sedení."},{"id":"teenager-balik","name":"Teenager pod tlakom – balíček","serviceId":"teenager-pod-tlakom","sessions":4,"price":179,"active":true,"extras":"","description":"4 samostatné koučovacie hodiny. Pre neplnoletého rezervuje zákonný zástupca."},{"id":"mysel-vitaza-balik","name":"Myseľ víťaza – balíček","serviceId":"mentalny-trening","sessions":4,"price":249,"active":true,"extras":"","description":"4 samostatné koučovacie hodiny mentálnej prípravy."},{"id":"relaxacia-balik","name":"Hlboká relaxácia – balíček","serviceId":"relaxacia","sessions":4,"price":159,"active":true,"extras":"","description":"4 individuálne relaxačné stretnutia."}]'::jsonb),updated_at=now() where id=1;
