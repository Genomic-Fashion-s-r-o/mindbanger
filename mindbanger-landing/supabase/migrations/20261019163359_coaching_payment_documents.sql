-- Separate accounting series explicitly approved by the owner. Never edits bookings or existing invoices.
create table public.appointment_document_settings(id integer primary key check(id=1),provider jsonb not null);
insert into public.appointment_document_settings values(1,'{"name":"Milkam s. r. o.","companyId":"46141472","taxId":"2023282558","address":"Lúčky 1529/3, 908 51 Holíč, Slovenská republika","registration":"Okresný súd Trnava, oddiel Sro, vložka 27540/T","email":"miroslav@mindbanger.com","phone":"+421948074767","vatPayer":false}');
create table public.appointment_document_counters(year integer primary key,next_value integer not null check(next_value between 1 and 100000));
insert into public.appointment_document_counters values(2026,1);
create table public.appointment_documents(
 id uuid primary key default gen_random_uuid(),appointment_id uuid not null references public.appointments(id) on delete restrict,
 intent text not null,number text not null unique,kind text not null check(kind in ('invoice','credit')),
 original_id uuid references public.appointment_documents(id) on delete restrict,amount_cents integer not null,
 refund_total integer not null default 0 check(refund_total between 0 and 4900),issued_at timestamptz not null default now(),snapshot jsonb not null,
 pdf_base64 text,pdf_sha256 text,emailed_at timestamptz,
 unique(intent,kind,refund_total),check((kind='invoice' and amount_cents=4900 and original_id is null and refund_total=0) or(kind='credit' and amount_cents<0 and original_id is not null and refund_total>0)),
 check((pdf_base64 is null)=(pdf_sha256 is null))
);
create index on public.appointment_documents(appointment_id,issued_at);
create table public.appointment_document_jobs(
 appointment_id uuid primary key references public.appointments(id) on delete restrict,booking jsonb not null,
 revision bigint not null default 1,done_revision bigint not null default 0,lease uuid,lease_until timestamptz,
 available_at timestamptz not null default now(),captured_at timestamptz not null default now(),attempts integer not null default 0
);
create function public.appointment_queue_document() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.kind='booking' and new.payment_intent_id is not null and ((new.paid and not old.paid) or new.stripe_refunded_amount>old.stripe_refunded_amount) then
  insert into public.appointment_document_jobs(appointment_id,booking) values(new.id,to_jsonb(new))
  on conflict(appointment_id) do update set revision=public.appointment_document_jobs.revision+1,available_at=now();
 end if;return new;
end $$;
create trigger appointment_document_queue after update on public.appointments for each row execute function public.appointment_queue_document();
create function public.appointment_claim_document() returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.appointment_document_jobs;token uuid:=gen_random_uuid();
begin
 select * into j from public.appointment_document_jobs where revision>done_revision and available_at<=now() and(lease_until is null or lease_until<now()) order by available_at for update skip locked limit 1;
 if not found then return null;end if;
 update public.appointment_document_jobs set lease=token,lease_until=now()+interval '3 minutes',attempts=attempts+1 where appointment_id=j.appointment_id;
 return jsonb_build_object('id',j.appointment_id,'lease',token,'revision',j.revision,'booking',j.booking,'paidAt',j.captured_at);
end $$;
create function public.appointment_document_number() returns text language plpgsql security invoker set search_path='' as $$
declare y integer:=extract(year from now() at time zone 'Europe/Bratislava');v integer;
begin
 insert into public.appointment_document_counters(year,next_value) values(y,1) on conflict do nothing;
 update public.appointment_document_counters set next_value=next_value+1 where year=y and next_value<100000 returning next_value-1 into v;
 if v is null then raise exception 'document_series_exhausted';end if;
 return lpad((y%100)::text,2,'0')||lpad(v::text,5,'0');
end $$;
create function public.appointment_issue_documents(p_id uuid,p_lease uuid,p_intent text,p_customer jsonb,p_paid_at timestamptz,p_refunded integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.appointment_document_jobs;d public.appointment_documents;cfg jsonb;snap jsonb;previous integer;
begin
 select * into strict j from public.appointment_document_jobs where appointment_id=p_id and lease=p_lease and lease_until>now() for update;
 if j.booking->>'payment_intent_id' is distinct from p_intent or (j.booking->>'price')::numeric<>49 or p_refunded is null or p_refunded<0 or p_refunded>4900 or p_paid_at is null or p_paid_at>now()+interval '5 minutes' then raise exception 'document_payment_mismatch';end if;
 select provider into strict cfg from public.appointment_document_settings where id=1;
 select * into d from public.appointment_documents where intent=p_intent and kind='invoice';
 if not found then
  if coalesce(p_customer->>'name','')='' or coalesce(j.booking->>'email','')='' then raise exception 'document_customer_missing';end if;
  snap:=jsonb_build_object('provider',cfg,'customer',p_customer||jsonb_build_object('email',j.booking->>'email'),'service','Coaching','startsAt',j.booking->>'starts_at','endsAt',j.booking->>'ends_at','paidAt',j.captured_at,'appointmentId',p_id,'intent',p_intent);
  insert into public.appointment_documents(appointment_id,intent,number,kind,amount_cents,snapshot) values(p_id,p_intent,public.appointment_document_number(),'invoice',4900,snap) returning * into d;
 end if;
 select coalesce(max(refund_total),0) into previous from public.appointment_documents where intent=p_intent and kind='credit';
 if p_refunded>previous then
  insert into public.appointment_documents(appointment_id,intent,number,kind,original_id,amount_cents,refund_total,snapshot)
  values(p_id,p_intent,public.appointment_document_number(),'credit',d.id,previous-p_refunded,p_refunded,d.snapshot||jsonb_build_object('originalNumber',d.number));
 end if;
 return(select coalesce(jsonb_agg(to_jsonb(x) order by x.issued_at,x.number),'[]') from public.appointment_documents x where x.intent=p_intent);
end $$;
create function public.appointment_document_immutable() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'document_immutable';end if;
 if (to_jsonb(new)-'pdf_base64'-'pdf_sha256'-'emailed_at') is distinct from(to_jsonb(old)-'pdf_base64'-'pdf_sha256'-'emailed_at') or(old.pdf_base64 is not null and(new.pdf_base64 is distinct from old.pdf_base64 or new.pdf_sha256 is distinct from old.pdf_sha256)) or(old.emailed_at is not null and new.emailed_at is distinct from old.emailed_at) then raise exception 'document_immutable';end if;
 return new;
end $$;
create trigger appointment_documents_immutable before update or delete on public.appointment_documents for each row execute function public.appointment_document_immutable();
do $$declare t text;fn record;begin
 foreach t in array array['appointment_document_settings','appointment_document_counters','appointment_documents','appointment_document_jobs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
 for fn in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('appointment_queue_document','appointment_claim_document','appointment_document_number','appointment_issue_documents','appointment_document_immutable') loop
  execute format('revoke all on function %s from public,anon,authenticated',fn.sig);
  execute format('grant execute on function %s to service_role',fn.sig);
 end loop;
end $$;
