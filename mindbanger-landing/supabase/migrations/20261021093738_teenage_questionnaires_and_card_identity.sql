alter table public.coaching_client_cards add column display_name text not null default '' check(length(display_name)<=120);
alter table public.coaching_client_records
 add column audience text not null default 'account' check(audience in('account','teenager')),
 add column guardian_record_id uuid references public.coaching_client_records(id) on delete restrict,
 add column teen_permission_revoked_at timestamptz;
-- Replace only the original visibility invariant, retaining all other checks.
do $$ declare target text; begin
 select conname into strict target from pg_constraint where conrelid='public.coaching_client_records'::regclass and contype='c' and pg_get_constraintdef(oid) like '%shared%' and pg_get_constraintdef(oid) like '%assigned%' and pg_get_constraintdef(oid) like '%answered%';
 execute format('alter table public.coaching_client_records drop constraint %I',target);
end $$;
alter table public.coaching_client_records add constraint coaching_audience_visibility check(audience='account' or not shared),
 add constraint coaching_assigned_visibility check(state not in('assigned','answered') or (audience='account' and shared) or (audience='teenager' and not shared));
create table public.coaching_teen_form_links (
 record_id uuid primary key references public.coaching_client_records(id) on delete cascade,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 token_ciphertext text not null, expires_at timestamptz not null, used_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.coaching_teen_form_links enable row level security;
revoke all on public.coaching_teen_form_links from public,anon,authenticated;
grant select,insert,update,delete on public.coaching_teen_form_links to service_role;
create function public.coaching_prepare_teen_form(p_record uuid,p_user uuid,p_revision integer,p_guardian uuid,p_guardian_revision integer,p_ciphertext text,p_hash text,p_token_ciphertext text,p_expires timestamptz,p_actor uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare g public.coaching_client_records;r public.coaching_client_records;
begin
 select * into g from public.coaching_client_records where id=p_guardian and user_id=p_user for update;
 if not found or g.kind<>'questionnaire' or g.audience<>'account' or g.state<>'answered' or g.teen_permission_revoked_at is not null or g.revision<>p_guardian_revision then return false;end if;
 select * into r from public.coaching_client_records where id=p_record and user_id=p_user for update;
 if not found or r.kind<>'questionnaire' or r.state not in('draft','assigned') or r.revision<>p_revision or r.notify_state in('queued','sending') then return false;end if;
 if p_expires<=now() or p_expires>now()+interval '7 days 1 minute' then return false;end if;
 update public.coaching_client_records set ciphertext=p_ciphertext,audience='teenager',shared=false,state='assigned',guardian_record_id=p_guardian,revision=revision+1,notify_state='queued',updated_at=now(),actor=p_actor::text where id=p_record;
 insert into public.coaching_teen_form_links(record_id,token_hash,token_ciphertext,expires_at) values(p_record,p_hash,p_token_ciphertext,p_expires)
 on conflict(record_id) do update set token_hash=excluded.token_hash,token_ciphertext=excluded.token_ciphertext,expires_at=excluded.expires_at,used_at=null,created_at=now();
 insert into public.coaching_card_audit(record_id,user_id,actor,action) values(p_record,p_user,p_actor,'manual_queue_teen_form');
 return true;
end $$;
revoke all on function public.coaching_prepare_teen_form(uuid,uuid,integer,uuid,integer,text,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.coaching_prepare_teen_form(uuid,uuid,integer,uuid,integer,text,text,text,timestamptz,uuid) to service_role;
create function public.coaching_answer_teen_form(p_record uuid,p_hash text,p_revision integer,p_ciphertext text) returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.coaching_client_records;l public.coaching_teen_form_links;gid uuid;g public.coaching_client_records;
begin
 select guardian_record_id into gid from public.coaching_client_records where id=p_record;
 select * into g from public.coaching_client_records where id=gid for update;
 if not found or g.state<>'answered' or g.audience<>'account' or g.teen_permission_revoked_at is not null then return false;end if;
 select * into r from public.coaching_client_records where id=p_record for update;
 if not found or r.kind<>'questionnaire' or r.audience<>'teenager' or r.shared or r.state<>'assigned' or r.revision<>p_revision or r.user_id<>g.user_id then return false;end if;
 select * into l from public.coaching_teen_form_links where record_id=p_record for update;
 if not found or l.token_hash<>p_hash or l.used_at is not null or l.expires_at<=now() then return false;end if;
 update public.coaching_client_records set ciphertext=p_ciphertext,state='answered',revision=revision+1,updated_at=now(),actor='teenager_private_link' where id=p_record;
 update public.coaching_teen_form_links set used_at=now(),token_ciphertext='' where record_id=p_record;
 insert into public.coaching_card_audit(record_id,user_id,actor,action) values(p_record,r.user_id,p_record,'teen_answer_via_private_link');
 return true;
end $$;
revoke all on function public.coaching_answer_teen_form(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.coaching_answer_teen_form(uuid,text,integer,text) to service_role;

create or replace function public.coaching_clients(p_query text default '',p_offset integer default 0) returns jsonb language sql stable security definer set search_path='' as $$
 -- Only service_role may execute: directory needs the auth email without granting auth.users access.
 with clients as (
 select u.id,u.email,coalesce(nullif(cc.display_name,''),nullif(p.full_name,''),a.customer_name,u.email) name,coalesce(nullif(p.full_name,''),a.customer_name,u.email) account_name,
 a.phone,a.customer_city city,a.customer_country country,
 (select count(*) from public.coaching_client_records r where r.user_id=u.id and r.review_after<=now()) review_due,
 (select min(b.starts_at) from public.appointments b where b.user_id=u.id and b.kind='booking' and b.status in('pending','confirmed') and b.starts_at>now() and(b.status<>'pending' or b.hold_until is null or b.hold_until>now())) next_at
 from auth.users u left join public.profiles p on p.id=u.id left join public.coaching_client_cards cc on cc.user_id=u.id
 left join lateral(select * from public.appointments b where b.user_id=u.id and b.kind='booking' order by b.created_at desc limit 1) a on true
 where (a.id is not null or exists(select 1 from public.coaching_client_cards c where c.user_id=u.id))
 and (strpos(lower(coalesce(u.email,'')),lower(left(p_query,100)))>0 or strpos(lower(coalesce(cc.display_name,'')||' '||coalesce(p.full_name,a.customer_name,'')),lower(left(p_query,100)))>0)
 ) select jsonb_build_object('total',(select count(*) from clients),'clients',coalesce((select jsonb_agg(to_jsonb(c)) from(select * from clients order by lower(name),id limit 50 offset greatest(0,least(p_offset,50000))) c),'[]'::jsonb))
$$;
revoke all on function public.coaching_clients(text,integer) from public,anon,authenticated;
grant execute on function public.coaching_clients(text,integer) to service_role;
