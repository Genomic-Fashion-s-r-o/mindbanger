-- First-party attribution only. No event outbox or transmission to ad platforms.
create table public.marketing_campaigns (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 1 and 80),
 campaign_name text not null default '' check(length(campaign_name)<=80),
 landing_path text not null default '/' check(landing_path='/' or landing_path~'^/sluzby/[a-z0-9-]+$'),
 source text not null check(source in ('facebook','instagram')),
 active boolean not null default true,
 is_test boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.marketing_touches (
 id uuid primary key default gen_random_uuid(),
 visitor_key uuid not null,
 campaign_id uuid not null references public.marketing_campaigns(id),
 consent_version text not null check(consent_version='booking-attribution-v1'),
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days'
);
create index marketing_touches_visitor on public.marketing_touches(visitor_key,last_seen_at desc);
create index marketing_touches_expiry on public.marketing_touches(last_seen_at);
create index marketing_touches_campaign on public.marketing_touches(campaign_id,last_seen_at);
create table public.marketing_booking_sources (
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 touch_id uuid not null references public.marketing_touches(id) on delete cascade,
 attached_at timestamptz not null default now()
);
create index marketing_booking_sources_touch on public.marketing_booking_sources(touch_id);
create table public.marketing_revoked_visitors(visitor_key uuid primary key,revoked_at timestamptz not null default now());
create table public.marketing_touch_limits(rate_key text primary key check(length(rate_key)=64),window_start timestamptz not null,attempts integer not null);
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_touches enable row level security;
alter table public.marketing_booking_sources enable row level security;
alter table public.marketing_revoked_visitors enable row level security;
alter table public.marketing_touch_limits enable row level security;
revoke all on public.marketing_campaigns,public.marketing_touches,public.marketing_booking_sources from public,anon,authenticated;
grant select,insert,update,delete on public.marketing_campaigns,public.marketing_touches,public.marketing_booking_sources to service_role;
revoke all on public.marketing_revoked_visitors from public,anon,authenticated;
grant select,insert,delete on public.marketing_revoked_visitors to service_role;
revoke all on public.marketing_touch_limits from public,anon,authenticated;
grant select,insert,update,delete on public.marketing_touch_limits to service_role;

create function public.marketing_allow_touch(p_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_key is null or length(p_key)<>64 then return false;end if;
 insert into public.marketing_touch_limits(rate_key,window_start,attempts) values(p_key,now(),1)
 on conflict(rate_key) do update set attempts=case when marketing_touch_limits.window_start<now()-interval '1 hour' then 1 else least(marketing_touch_limits.attempts+1,61) end,
 window_start=case when marketing_touch_limits.window_start<now()-interval '1 hour' then now() else marketing_touch_limits.window_start end
 returning attempts into n;
 return n<=60;
end $$;

create function public.marketing_record_touch(p_visitor uuid,p_campaign uuid,p_version text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare last_touch public.marketing_touches;
begin
 if p_visitor is null or p_version is distinct from 'booking-attribution-v1' then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,1));
 if exists(select 1 from public.marketing_revoked_visitors where visitor_key=p_visitor) then return false;end if;
 if not exists(select 1 from public.marketing_campaigns where id=p_campaign and active) then return false;end if;
 select * into last_touch from public.marketing_touches where visitor_key=p_visitor order by last_seen_at desc,id desc limit 1;
 if last_touch.campaign_id=p_campaign and last_touch.last_seen_at>now()-interval '1 minute' then return true;end if;
 if (select count(*) from public.marketing_touches where visitor_key=p_visitor and last_seen_at>now()-interval '1 hour')>=60 then return false;end if;
 insert into public.marketing_touches(visitor_key,campaign_id,consent_version)
 values(p_visitor,p_campaign,p_version);
 return true;
end $$;

create function public.marketing_attach_booking(p_booking uuid,p_user uuid,p_visitor uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare b public.appointments;t uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,1));
 if exists(select 1 from public.marketing_revoked_visitors where visitor_key=p_visitor) then return;end if;
 select * into b from public.appointments where id=p_booking and user_id=p_user and kind='booking';
 if not found or p_user is null or p_visitor is null then return;end if;
 -- A later visit, retry or forged booking id cannot rewrite the original source.
 select id into t from public.marketing_touches
 where visitor_key=p_visitor and last_seen_at<=b.created_at and expires_at>now()
 and b.created_at-last_seen_at<=interval '30 days'
 order by last_seen_at desc,id limit 1;
 if t is null then return;end if;
 insert into public.marketing_booking_sources(appointment_id,touch_id) values(p_booking,t)
 on conflict(appointment_id) do nothing;
end $$;

create function public.marketing_withdraw(p_visitor uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,1));
 insert into public.marketing_revoked_visitors(visitor_key) values(p_visitor) on conflict do nothing;
 delete from public.marketing_touches where visitor_key=p_visitor;
end
$$;
create function public.marketing_purge() returns integer
language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 delete from public.marketing_touches where id in
 (select id from public.marketing_touches where last_seen_at<now()-interval '90 days' order by last_seen_at limit 10000);
 get diagnostics n=row_count;
 delete from public.marketing_revoked_visitors where revoked_at<now()-interval '90 days';
 delete from public.marketing_touch_limits where window_start<now()-interval '1 day';
 return n;
end $$;

create function public.marketing_forget_anonymized_booking() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if old.user_id is not null and new.user_id is null then
  delete from public.marketing_booking_sources where appointment_id=new.id;
 end if;
 return new;
end $$;
create trigger marketing_forget_anonymized_booking after update of user_id on public.appointments
for each row execute function public.marketing_forget_anonymized_booking();

create function public.marketing_booking_details(p_ids uuid[],p_excluded uuid[] default '{}')
returns table(appointment_id uuid,campaign_id uuid,ad_name text,campaign_name text,source text,is_test boolean)
language sql security invoker set search_path='' as $$
 select s.appointment_id,c.id,c.name,c.campaign_name,c.source,c.is_test
 from public.marketing_booking_sources s join public.marketing_touches t on t.id=s.touch_id
 join public.marketing_campaigns c on c.id=t.campaign_id
 where s.appointment_id=any(p_ids) and not(s.appointment_id=any(coalesce(p_excluded,'{}'::uuid[])))
 limit 700;
$$;

create function public.marketing_report(p_from date,p_to date,p_excluded uuid[] default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>89
 or p_from<(now() at time zone 'Europe/Bratislava')::date-89
 or p_to>(now() at time zone 'Europe/Bratislava')::date then raise exception 'invalid_report_period';end if;
 with period as (
  select p_from::timestamp at time zone 'Europe/Bratislava' since,(p_to+1)::timestamp at time zone 'Europe/Bratislava' until
 ), bookings as materialized (
  select b.id,b.user_id,b.status,b.funding_type,b.paid,b.payment_review,b.payment_state,b.payment_refunded,b.stripe_refunded_amount,b.price,
   t.campaign_id,
   (b.funding_type='card' and b.payment_intent_id is not null
    and (b.payment_state='captured' or (b.payment_flow='confirm_then_pay' and (b.paid or b.payment_refunded or b.stripe_refunded_amount>0)))) received,
   (b.funding_type='card' and b.paid and b.payment_intent_id is not null and not b.payment_refunded and not b.payment_review
    and (b.payment_state='captured' or b.payment_flow='confirm_then_pay')
    and b.status in ('confirmed','completed','no_show')) converted
  from public.appointments b cross join period p
  left join public.marketing_booking_sources s on s.appointment_id=b.id
  left join public.marketing_touches t on t.id=s.touch_id
  left join public.marketing_campaigns campaign on campaign.id=t.campaign_id
  where b.kind='booking' and b.created_at>=p.since and b.created_at<p.until
  and not (b.id=any(coalesce(p_excluded,'{}'::uuid[])))
  and not coalesce(campaign.is_test,false)
 ), stats as (
  select campaign_id,count(*) requests,count(*) filter(where converted) confirmed_paid,
   count(distinct user_id) filter(where converted) paying_clients,
   coalesce(sum(greatest(0,round(price*100)-stripe_refunded_amount)) filter(where received),0)::bigint net_cents,
   count(*) filter(where received) captured_payments,count(*) filter(where payment_review) needs_review,
   count(*) filter(where payment_state='authorized' and not paid and status='pending') authorized,
   count(*) filter(where status in ('cancelled','expired')) cancelled,
   count(*) filter(where payment_refunded or stripe_refunded_amount>0) refunded,
   count(*) filter(where funding_type='package' and status in ('confirmed','completed','no_show')) package_sessions
  from bookings group by campaign_id
 ), visits as (
  select t.campaign_id,count(distinct t.visitor_key) browsers
  from public.marketing_touches t cross join period p
  where t.last_seen_at>=p.since and t.last_seen_at<p.until group by t.campaign_id
 ), campaigns as (
  select id,name,campaign_name,source,active from public.marketing_campaigns where not is_test
  union all select null::uuid,'Bez priradeného odkazu','','unknown',false
 ), rows as (
  select c.id,c.name,c.campaign_name,c.source,c.active,coalesce(v.browsers,0) browsers,
   coalesce(s.requests,0) requests,coalesce(s.confirmed_paid,0) confirmed_paid,
   coalesce(s.paying_clients,0) paying_clients,coalesce(s.net_cents,0) net_cents,
   coalesce(s.captured_payments,0) captured_payments,coalesce(s.needs_review,0) needs_review,coalesce(s.authorized,0) authorized,
   coalesce(s.cancelled,0) cancelled,coalesce(s.refunded,0) refunded,coalesce(s.package_sessions,0) package_sessions
  from campaigns c left join stats s on s.campaign_id is not distinct from c.id
  left join visits v on v.campaign_id=c.id
 )
 select jsonb_build_object('rows',(select coalesce(jsonb_agg(to_jsonb(r) order by r.name),'[]') from rows r),
  'totals',(select jsonb_build_object('requests',count(*),'confirmed_paid',count(*) filter(where converted),
   'paying_clients',count(distinct user_id) filter(where converted),
   'net_cents',coalesce(sum(greatest(0,round(price*100)-stripe_refunded_amount)) filter(where received),0)::bigint,
   'captured_payments',count(*) filter(where received),'needs_review',count(*) filter(where payment_review),
   'authorized',count(*) filter(where payment_state='authorized' and not paid and status='pending'),
   'cancelled',count(*) filter(where status in ('cancelled','expired')),
   'refunded',count(*) filter(where payment_refunded or stripe_refunded_amount>0),
   'package_sessions',count(*) filter(where funding_type='package' and status in ('confirmed','completed','no_show')))
   from bookings)) into result;
 return result;
end $$;

revoke all on function public.marketing_record_touch(uuid,uuid,text),public.marketing_attach_booking(uuid,uuid,uuid),
public.marketing_withdraw(uuid),public.marketing_purge(),public.marketing_report(date,date,uuid[]),
public.marketing_forget_anonymized_booking() from public,anon,authenticated;
revoke all on function public.marketing_booking_details(uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.marketing_record_touch(uuid,uuid,text),public.marketing_attach_booking(uuid,uuid,uuid),
public.marketing_withdraw(uuid),public.marketing_purge(),public.marketing_report(date,date,uuid[]),
public.marketing_forget_anonymized_booking() to service_role;
grant execute on function public.marketing_booking_details(uuid[],uuid[]) to service_role;
revoke all on function public.marketing_allow_touch(text) from public,anon,authenticated;
grant execute on function public.marketing_allow_touch(text) to service_role;
