-- Nullable columns preserve existing bookings. Only the server can invoke the contact wrapper.
alter table public.appointments add column if not exists customer_first_name text,
 add column if not exists customer_last_name text,
 add column if not exists customer_city text,
 add column if not exists customer_country text;

create function public.appointment_create_contact(p_booking jsonb,p_contact jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; first_name text:=btrim(p_contact->>'firstName'); last_name text:=btrim(p_contact->>'lastName'); city text:=btrim(p_contact->>'city'); country text:=btrim(p_contact->>'country');
begin
 if first_name is null or length(first_name) not between 1 and 60 or last_name is null or length(last_name) not between 1 and 60 or city is null or length(city) not between 2 and 100 or country is null or length(country) not between 2 and 60 or length(regexp_replace(coalesce(p_booking->>'p_phone',''),'[^0-9]','','g'))<6 then raise exception 'contact_required';end if;
 result:=public.appointment_create_catalog(
 (p_booking->>'p_user')::uuid,p_booking->>'p_service',(p_booking->>'p_start')::timestamptz,
 first_name||' '||last_name,p_booking->>'p_email',p_booking->>'p_phone',p_booking->>'p_hash',
 (p_booking->>'p_request_id')::uuid,p_booking->>'p_manage_url',p_booking->>'p_legal_version',p_booking->>'p_topic',p_booking->>'p_note',(p_booking->>'p_adult')::boolean,
 coalesce(p_booking->>'p_package',''),nullif(p_booking->>'p_credit','')::uuid,coalesce(p_booking->>'p_participant',''),coalesce((p_booking->>'p_age')::integer,0),coalesce((p_booking->>'p_guardian')::boolean,false));
 update public.appointments set customer_first_name=first_name,customer_last_name=last_name,customer_city=city,customer_country=country where id=result and user_id=(p_booking->>'p_user')::uuid and customer_first_name is null;
 return result;
end $$;
revoke all on function public.appointment_create_contact(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.appointment_create_contact(jsonb,jsonb) to service_role;

-- Extend the existing anonymisation to the newly stored contact fields.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.appointment_claim_mail(integer)'::regprocedure);
 if position('customer_name=null,email=null,phone=null' in definition)=0 then raise exception 'anonymisation_pattern_changed';end if;
 execute replace(definition,'customer_name=null,email=null,phone=null','customer_name=null,email=null,phone=null,customer_first_name=null,customer_last_name=null,customer_city=null,customer_country=null');
end $$;
notify pgrst,'reload schema';
