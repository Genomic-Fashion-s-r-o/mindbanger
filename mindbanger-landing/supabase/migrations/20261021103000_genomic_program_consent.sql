-- Keep the former Milkam interest list separated from new Genomic Fashion consent.
create or replace function public.program_interest_register(p_email text,p_unsubscribe text,p_bucket text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 delete from program_interest_limits where expires_at<now();
 insert into program_interest_limits values(p_bucket,1,now()+interval '1 hour')
 on conflict(bucket) do update set count=program_interest_limits.count+1 returning count into n;
 if n>6 then return false;end if;
 insert into program_interest(email,state,confirmed_at,confirm_hash,unsubscribe_hash,consent_version)
 values(p_email,'confirmed',now(),null,p_unsubscribe,'sugar-interest-genomic-2026-10-21')
 on conflict(email) do update set state='confirmed',confirmed_at=now(),confirm_hash=null,
 unsubscribe_hash=excluded.unsubscribe_hash,requested_at=now(),consent_version=excluded.consent_version;
 return true;
end $$;

update public.program_deliveries d set state='skipped',finished_at=now(),error='controller_scope_changed'
where d.state='queued' and exists(select 1 from public.program_interest i where i.id=d.interest_id and i.consent_version<>'sugar-interest-genomic-2026-10-21');

create or replace function public.program_message_queue(p_id uuid,p_revision integer) returns integer language plpgsql set search_path=public as $$
declare m program_messages;n integer;
begin
 select * into m from program_messages where id=p_id for update;
 if m.kind<>'manual' or m.state<>'draft' or m.revision<>p_revision then raise exception 'message_locked_or_changed';end if;
 if m.subject like '%[DOPLŇ%' or m.body like '%[DOPLŇ%' then raise exception 'unfinished_messages';end if;
 insert into program_deliveries(message_id,interest_id) select m.id,id from program_interest where state='confirmed' and consent_version='sugar-interest-genomic-2026-10-21' on conflict do nothing;
 get diagnostics n=row_count;if n=0 then raise exception 'no_confirmed_recipients';end if;
 update program_messages set state='queued',due_at=now(),revision=revision+1 where id=m.id;return n;
end $$;

create or replace function public.program_campaign_prepare() returns integer language plpgsql set search_path=public as $$
declare c program_campaign_settings;m program_messages;n integer:=0;
begin
 select * into c from program_campaign_settings where id='sugar-november-2026' for update skip locked;
 if not found or not c.enabled then return 0;end if;
 update program_messages set state='missed' where kind='automatic' and state='scheduled' and due_at<now()-interval '2 hours';
 update program_deliveries d set state='skipped',error='send_window_expired',finished_at=now() from program_messages msg where d.message_id=msg.id and msg.kind='automatic' and d.state='queued' and msg.due_at<now()-interval '2 hours';
 for m in select * from program_messages where kind='automatic' and state='scheduled' and due_at<=now() and due_at>=now()-interval '2 hours' for update skip locked loop
  insert into program_deliveries(message_id,interest_id) select m.id,id from program_interest where state='confirmed' and consent_version='sugar-interest-genomic-2026-10-21' on conflict do nothing;
  update program_messages set state=case when exists(select 1 from program_deliveries where message_id=m.id) then 'queued' else 'completed' end where id=m.id;n:=n+1;
 end loop;return n;
end $$;

create or replace function public.program_delivery_claim(p_limit integer default 10) returns jsonb language plpgsql set search_path=public as $$
declare result jsonb;
begin
 update program_deliveries set state='review',error='interrupted_delivery_check_brevo',unsubscribe_token=null where state='processing' and claimed_at<now()-interval '5 minutes';
 update program_deliveries d set state='skipped',finished_at=now(),error='recipient_removed' where d.state='queued' and not exists(select 1 from program_interest i where i.id=d.interest_id and i.state='confirmed' and i.consent_version='sugar-interest-genomic-2026-10-21');
 with chosen as(select d.id,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') token from program_deliveries d join program_messages m on m.id=d.message_id join program_interest i on i.id=d.interest_id cross join program_campaign_settings c where d.state='queued' and m.state='queued' and i.state='confirmed' and i.consent_version='sugar-interest-genomic-2026-10-21' and(m.kind='manual' or(c.enabled and m.due_at>=now()-interval '2 hours')) order by d.created_at limit least(greatest(p_limit,1),10) for update of d skip locked),
 claimed as(update program_deliveries d set state='processing',lease=gen_random_uuid(),claimed_at=now(),unsubscribe_token=chosen.token,unsubscribe_hash=encode(sha256(chosen.token::bytea),'hex') from chosen where d.id=chosen.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'lease',d.lease,'kind',m.kind,'interestId',d.interest_id,'email',i.email,'token',d.unsubscribe_token,'subject',m.subject,'body',m.body,'buttonText',m.button_text,'buttonUrl',m.button_url,'launchDate',c.launch_date,'campaignName',c.name)), '[]'::jsonb) into result from claimed d join program_messages m on m.id=d.message_id join program_interest i on i.id=d.interest_id cross join program_campaign_settings c;
 return result;
end $$;

create or replace function public.program_campaign_overview() returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('campaign',(select to_jsonb(c) from program_campaign_settings c),'confirmed',(select count(*) from program_interest where state='confirmed' and consent_version='sugar-interest-genomic-2026-10-21'),'pending',0,
 'messages',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('stats',coalesce((select jsonb_object_agg(s.state,s.n) from(select d.state,count(*) n from program_deliveries d where d.message_id=m.id group by d.state)s),'{}'::jsonb)) order by m.created_at desc) from program_messages m where state<>'archived'),'[]'::jsonb));
$$;

create table public.digital_withdrawals(
 id uuid primary key default gen_random_uuid(), full_name text not null check(length(full_name) between 2 and 160),
 email text not null check(length(email) between 3 and 254), contract_ref text not null check(length(contract_ref) between 2 and 200),
 product text not null check(length(product) between 2 and 200), locale text not null check(locale in('sk','cs','en')),
 received_at timestamptz not null default now(), confirmation_sent_at timestamptz
);
alter table public.digital_withdrawals enable row level security;
revoke all on public.digital_withdrawals from public,anon,authenticated;
grant select,insert,update on public.digital_withdrawals to service_role;

create table public.digital_order_consents(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 email text not null, product text not null, terms_version text not null check(terms_version='daily-2026-10-21-v2'),
 terms_accepted boolean not null check(terms_accepted), performance_requested boolean not null check(performance_requested),
 adult_confirmed boolean not null check(adult_confirmed), locale text not null check(locale in('sk','cs','en')),
 stripe_session_id text unique, created_at timestamptz not null default now()
);
alter table public.digital_order_consents enable row level security;
revoke all on public.digital_order_consents from public,anon,authenticated;
grant select,insert,update on public.digital_order_consents to service_role;
