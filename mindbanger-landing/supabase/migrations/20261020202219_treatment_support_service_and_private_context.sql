-- Add one service without replacing existing prices, availability or packages.
do $$ begin
 if not exists(select 1 from public.appointment_settings where id=1 and (config->>'catalogVersion')::int=2) then raise exception 'catalog_v2_required';end if;
end $$;
update public.appointment_settings set config=jsonb_set(config,'{services}',(config->'services')||'[{
 "id":"opora-pocas-liecby","name":"Opora počas liečby","price":49,"minutes":50,"slotMinutes":60,"active":true,
 "description":"Individuálny nezdravotnícky koučing popri lekárskej starostlivosti. Priestor pre obavy, pokojnejší prístup a zvládnuteľné kroky v každodennom živote."
}]'::jsonb) where id=1 and not exists(select 1 from jsonb_array_elements(config->'services') s where s->>'id'='opora-pocas-liecby');

create table public.appointment_support_context(
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 ciphertext text not null check(length(ciphertext) between 40 and 6000),
 consent_version text not null check(consent_version='support-context-2026-10-20'),
 consent_at timestamptz not null default now(),expires_at timestamptz not null,
 updated_at timestamptz not null default now()
);
alter table public.appointment_support_context enable row level security;
revoke all on public.appointment_support_context from public,anon,authenticated;
grant select,insert,update,delete on public.appointment_support_context to service_role;
create function public.appointment_support_write(p_id uuid,p_user uuid,p_ciphertext text,p_version text)
returns void language plpgsql security invoker set search_path=public as $$
declare b public.appointments;expiry timestamptz;
begin
 select * into b from appointments where id=p_id and user_id=p_user and service_id='opora-pocas-liecby' and kind='booking' for update;
 if b.id is null or b.status not in('pending','confirmed','completed','no_show') then raise exception 'support_context_unavailable';end if;
 expiry=least(b.starts_at+interval '30 days',now()+interval '90 days');
 if expiry<=now() or p_version is distinct from 'support-context-2026-10-20' then raise exception 'support_context_unavailable';end if;
 insert into appointment_support_context(appointment_id,user_id,ciphertext,consent_version,expires_at)
 values(b.id,p_user,p_ciphertext,p_version,expiry)
 on conflict(appointment_id) do update set ciphertext=excluded.ciphertext,consent_version=excluded.consent_version,consent_at=now(),updated_at=now(),expires_at=excluded.expires_at;
end $$;
create function public.appointment_support_purge() returns void language sql security invoker set search_path=public as $$
 delete from appointment_support_context c using appointments b where c.appointment_id=b.id and (c.expires_at<=now() or b.status in('cancelled','expired') or b.starts_at+interval '30 days'<=now());
$$;
revoke all on function public.appointment_support_write(uuid,uuid,text,text),public.appointment_support_purge() from public,anon,authenticated;
grant execute on function public.appointment_support_write(uuid,uuid,text,text),public.appointment_support_purge() to service_role;
