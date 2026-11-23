-- Czech storefront: keep the booking currency immutable from order creation through Stripe and documents.
alter table public.appointments
  add column if not exists currency text not null default 'eur',
  add column if not exists locale text not null default 'sk';

alter table public.appointments drop constraint if exists appointments_currency_check;
alter table public.appointments add constraint appointments_currency_check check(currency in ('eur','czk'));
alter table public.appointments drop constraint if exists appointments_locale_check;
alter table public.appointments add constraint appointments_locale_check check(locale in ('sk','cs'));

create or replace function public.appointment_create_contact(p_booking jsonb,p_contact jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare
 result uuid;cfg jsonb;svc jsonb;offer jsonb;amount numeric;
 first_name text:=btrim(p_contact->>'firstName');last_name text:=btrim(p_contact->>'lastName');city text:=btrim(p_contact->>'city');country text:=btrim(p_contact->>'country');
 requested_locale text:=case when p_booking->>'p_locale'='cs' and p_booking->>'p_currency'='czk' then 'cs' else 'sk' end;
begin
 if first_name is null or length(first_name) not between 1 and 60 or last_name is null or length(last_name) not between 1 and 60 or city is null or length(city) not between 2 and 100 or country is null or length(country) not between 2 and 60 or length(regexp_replace(coalesce(p_booking->>'p_phone',''),'[^0-9]','','g'))<6 then raise exception 'contact_required';end if;
 result:=public.appointment_create_catalog(
 (p_booking->>'p_user')::uuid,p_booking->>'p_service',(p_booking->>'p_start')::timestamptz,
 first_name||' '||last_name,p_booking->>'p_email',p_booking->>'p_phone',p_booking->>'p_hash',
 (p_booking->>'p_request_id')::uuid,p_booking->>'p_manage_url',p_booking->>'p_legal_version',p_booking->>'p_topic',p_booking->>'p_note',(p_booking->>'p_adult')::boolean,
 coalesce(p_booking->>'p_package',''),nullif(p_booking->>'p_credit','')::uuid,coalesce(p_booking->>'p_participant',''),coalesce((p_booking->>'p_age')::integer,0),coalesce((p_booking->>'p_guardian')::boolean,false));

 update public.appointments set customer_first_name=first_name,customer_last_name=last_name,customer_city=city,customer_country=country where id=result and user_id=(p_booking->>'p_user')::uuid and customer_first_name is null;

 if requested_locale='cs' then
  select config into strict cfg from public.appointment_settings where id=1;
  select value into svc from jsonb_array_elements(cfg->'services') where value->>'id'=p_booking->>'p_service';
  if coalesce(p_booking->>'p_package','')<>'' then
   select value into offer from jsonb_array_elements(cfg->'packages') where value->>'id'=p_booking->>'p_package';
  end if;
  amount:=case when nullif(p_booking->>'p_credit','') is not null then 0 else round(((coalesce(offer,svc)->>'price')::numeric*1990/49)/10)*10 end;
  update public.appointments set
   price=amount,currency='czk',locale='cs',
   service_name=case service_id
    when 'vypni-hlavu' then 'Vypni hlavu' when 'zvladaj-stres' then 'Zvládej stres s větším klidem'
    when 'znovu-si-ver' then 'Znovu si věř' when 'individualny-coaching' then 'Najdi svůj další krok'
    when 'teenager-pod-tlakom' then 'Teenager pod tlakem' when 'mentalny-trening' then 'Mysl vítěze'
    when 'relaxacia' then 'Hluboká relaxace' when 'opora-pocas-liecby' then 'Opora během léčby'
    when 'premiovy-mentalny-koucing' then 'Prémiový mentální koučink' else service_name end,
   package_snapshot=case when package_snapshot is null then null else package_snapshot||jsonb_build_object('price',amount,'currency','czk') end,
   payment_terms=payment_terms||jsonb_build_object('currency','czk','locale','cs','serviceName',case service_id
    when 'zvladaj-stres' then 'Zvládej stres s větším klidem' when 'znovu-si-ver' then 'Znovu si věř'
    when 'individualny-coaching' then 'Najdi svůj další krok' when 'mentalny-trening' then 'Mysl vítěze'
    when 'relaxacia' then 'Hluboká relaxace' when 'opora-pocas-liecby' then 'Opora během léčby'
    when 'premiovy-mentalny-koucing' then 'Prémiový mentální koučink' else service_name end)
  where id=result and user_id=(p_booking->>'p_user')::uuid and (stripe_session_id is null or currency='czk');
 end if;
 return result;
end $$;

-- Existing payment functions retain all state-machine checks; only the hard-coded EUR comparison becomes order-currency aware.
do $$
declare fn record;definition text;
begin
 for fn in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('appointment_record_authorization','appointment_record_capture','appointment_record_payment','appointment_record_refund') loop
  definition:=pg_get_functiondef(fn.oid);
  definition:=replace(definition,$find$p_currency is distinct from 'eur'$find$,$replacement$p_currency is distinct from b.currency$replacement$);
  definition:=replace(definition,$find$p_currency <> 'eur'$find$,$replacement$p_currency <> b.currency$replacement$);
  definition:=replace(definition,$find$p_currency<>'eur'$find$,$replacement$p_currency<>b.currency$replacement$);
  execute definition;
 end loop;
end $$;

do $$
declare definition text;
begin
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='appointment_queue_document' limit 1;
 definition:=replace(definition,$find$'ends_at', new.ends_at)$find$,$replacement$'ends_at',new.ends_at,'currency',new.currency,'locale',new.locale)$replacement$);
 definition:=replace(definition,$find$'ends_at',new.ends_at)$find$,$replacement$'ends_at',new.ends_at,'currency',new.currency,'locale',new.locale)$replacement$);
 execute definition;

 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='appointment_issue_documents' limit 1;
 definition:=replace(definition,$find$'serviceName', j.booking ->> 'service_name'::text)$find$,$replacement$'serviceName',j.booking->>'service_name','currency',j.booking->>'currency','locale',j.booking->>'locale')$replacement$);
 definition:=replace(definition,$find$'serviceName',j.booking->>'service_name')$find$,$replacement$'serviceName',j.booking->>'service_name','currency',j.booking->>'currency','locale',j.booking->>'locale')$replacement$);
 execute definition;
end $$;

revoke all on function public.appointment_create_contact(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.appointment_create_contact(jsonb,jsonb) to service_role;
notify pgrst,'reload schema';
