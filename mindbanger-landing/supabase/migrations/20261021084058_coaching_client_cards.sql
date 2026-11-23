-- Independent from online-program memberships. Existing accounts and bookings stay unchanged.
create table public.coaching_client_cards (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), actor text not null
);
create table public.coaching_client_records (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 appointment_id uuid references public.appointments(id) on delete restrict,
 kind text not null check(kind in('note','transcript','file','questionnaire')),
 ciphertext text not null check(length(ciphertext)<150000), shared boolean not null default false,
 state text not null default 'draft' check(state in('draft','assigned','answered','archived')),
 file_path text unique, revision integer not null default 0,
 notify_state text not null default 'none' check(notify_state in('none','queued','sending','sent','review','skipped')),
 review_after timestamptz not null default (now()+interval '24 months'),
 notify_at timestamptz, created_at timestamptz not null default now(),updated_at timestamptz not null default now(), actor text not null,
 check ((kind='file')=(file_path is not null)),
 check (kind='questionnaire' or state in('draft','archived')),
 check (state not in('assigned','answered') or shared)
);
create index coaching_records_client on public.coaching_client_records(user_id,created_at desc);
create index coaching_records_review on public.coaching_client_records(user_id,review_after);
create index coaching_records_mail on public.coaching_client_records(notify_state) where notify_state='queued';
create table public.coaching_card_audit (
 id bigint generated always as identity primary key,record_id uuid, user_id uuid not null,
 actor uuid not null, action text not null,created_at timestamptz not null default now()
);
alter table public.coaching_client_cards enable row level security;
alter table public.coaching_client_records enable row level security;
alter table public.coaching_card_audit enable row level security;
revoke all on public.coaching_client_cards,public.coaching_client_records,public.coaching_card_audit from public,anon,authenticated;
grant select,insert,update,delete on public.coaching_client_cards,public.coaching_client_records,public.coaching_card_audit to service_role;
grant usage,select on sequence public.coaching_card_audit_id_seq to service_role;
create function public.coaching_card_check_appointment() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.appointment_id is not null and not exists(select 1 from public.appointments where id=new.appointment_id and user_id=new.user_id and kind='booking') then raise exception 'appointment_owner_mismatch';end if;
 return new;
end $$;
revoke all on function public.coaching_card_check_appointment() from public,anon,authenticated;
create trigger coaching_record_owner before insert or update on public.coaching_client_records for each row execute function public.coaching_card_check_appointment();
create function public.coaching_clients(p_query text default '',p_offset integer default 0) returns jsonb language sql stable security definer set search_path='' as $$
 -- Only service_role may execute: directory needs the auth email without granting auth.users access.
 with clients as (
 select u.id,u.email,coalesce(nullif(p.full_name,''),a.customer_name,u.email) name,
 a.phone,a.customer_city city,a.customer_country country,
 (select count(*) from public.coaching_client_records r where r.user_id=u.id and r.review_after<=now()) review_due,
 (select min(b.starts_at) from public.appointments b where b.user_id=u.id and b.kind='booking' and b.status in('pending','confirmed') and b.starts_at>now() and(b.status<>'pending' or b.hold_until is null or b.hold_until>now())) next_at
 from auth.users u left join public.profiles p on p.id=u.id
 left join lateral(select * from public.appointments b where b.user_id=u.id and b.kind='booking' order by b.created_at desc limit 1) a on true
 where (a.id is not null or exists(select 1 from public.coaching_client_cards c where c.user_id=u.id))
 and (strpos(lower(coalesce(u.email,'')),lower(left(p_query,100)))>0 or strpos(lower(coalesce(p.full_name,a.customer_name,'')),lower(left(p_query,100)))>0)
 ) select jsonb_build_object('total',(select count(*) from clients),'clients',coalesce((select jsonb_agg(to_jsonb(c)) from(select * from clients order by lower(name),id limit 50 offset greatest(0,least(p_offset,50000))) c),'[]'::jsonb))
$$;
revoke all on function public.coaching_clients(text,integer) from public,anon,authenticated;
grant execute on function public.coaching_clients(text,integer) to service_role;
-- No client-facing Storage policies. Access is mediated by authenticated, owner-checked server routes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('coaching-client-files','coaching-client-files',false,5000000,array['application/octet-stream']);
create policy coaching_files_server_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'coaching-client-files') with check(bucket_id<>'coaching-client-files');
