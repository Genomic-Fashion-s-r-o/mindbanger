create table public.program_campaign_settings (
 id text primary key check(id='sugar-november-2026'), name text not null default 'Chuť na sladké pod kontrolou · prvý turnus',
 launch_date date check(launch_date between date '2026-11-01' and date '2027-01-31'), enabled boolean not null default false, revision integer not null default 1
);
insert into public.program_campaign_settings(id) values('sugar-november-2026');
create table public.program_messages (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in('manual','automatic')),
 subject text not null check(length(subject) between 3 and 150), body text not null check(length(body) between 10 and 10000),
 button_text text not null default '' check(length(button_text)<=80), button_url text not null default '' check(length(button_url)<=1000),
 days_before integer not null default 0 check(days_before between 0 and 60), send_time time not null default time '09:00',
 due_at timestamptz, state text not null default 'draft' check(state in('draft','scheduled','queued','completed','missed','archived')),
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.program_deliveries (
 id uuid primary key default gen_random_uuid(), message_id uuid not null references public.program_messages(id),
 interest_id uuid references public.program_interest(id) on delete set null,
 state text not null default 'queued' check(state in('queued','processing','sent','failed','review','skipped')),
 lease uuid, claimed_at timestamptz, finished_at timestamptz, provider_id text, error text,
 unsubscribe_token text, unsubscribe_hash text, created_at timestamptz not null default now(), unique(message_id,interest_id)
);
create index on public.program_deliveries(state,created_at);
create index on public.program_deliveries(unsubscribe_hash);
alter table public.program_campaign_settings enable row level security;
alter table public.program_messages enable row level security;
alter table public.program_deliveries enable row level security;
revoke all on public.program_campaign_settings,public.program_messages,public.program_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.program_campaign_settings,public.program_messages,public.program_deliveries to service_role;

create function public.program_campaign_save(p_name text,p_date date) returns void language plpgsql set search_path=public as $$
begin
 if length(p_name) not between 3 and 120 then raise exception 'invalid_campaign';end if;
 perform 1 from program_campaign_settings where id='sugar-november-2026' and not enabled for update;
 if not found then raise exception 'pause_campaign_first';end if;
 update program_campaign_settings set name=p_name,launch_date=p_date,revision=revision+1 where id='sugar-november-2026';
 update program_messages set state='draft',due_at=null where kind='automatic' and state in('scheduled','missed');
end $$;
create function public.program_message_save(p_id uuid,p_revision integer,p_kind text,p_subject text,p_body text,p_button text,p_url text,p_days integer,p_time time) returns uuid language plpgsql set search_path=public as $$
declare mid uuid;
begin
 perform 1 from program_campaign_settings where id='sugar-november-2026' for update;
 if p_id is not null then
  update program_messages set kind=p_kind,subject=p_subject,body=p_body,button_text=p_button,button_url=p_url,days_before=p_days,send_time=p_time,state='draft',due_at=null,revision=revision+1,updated_at=now()
  where id=p_id and revision=p_revision and state in('draft','scheduled','missed') and not exists(select 1 from program_deliveries where message_id=p_id) and not exists(select 1 from program_campaign_settings where enabled and(p_kind='automatic' or program_messages.kind='automatic')) returning id into mid;
  if mid is null then raise exception 'message_locked_or_changed';end if;
 else
  if p_kind='automatic' and exists(select 1 from program_campaign_settings where enabled) then raise exception 'pause_campaign_first';end if;
  insert into program_messages(kind,subject,body,button_text,button_url,days_before,send_time) values(p_kind,p_subject,p_body,p_button,p_url,p_days,p_time) returning id into mid;
 end if;
 update program_campaign_settings set revision=revision+1 where id='sugar-november-2026';return mid;
end $$;
create function public.program_message_archive(p_id uuid,p_revision integer) returns void language plpgsql set search_path=public as $$
begin
 perform 1 from program_campaign_settings where id='sugar-november-2026' for update;
 update program_messages set state='archived',revision=revision+1 where id=p_id and revision=p_revision and state in('draft','scheduled','missed') and not exists(select 1 from program_deliveries where message_id=p_id);
 if not found then raise exception 'message_locked_or_changed';end if;
 update program_campaign_settings set revision=revision+1 where id='sugar-november-2026';
end $$;
create function public.program_campaign_toggle(p_enabled boolean,p_revision integer) returns void language plpgsql set search_path=public as $$
declare c program_campaign_settings;
begin
 select * into c from program_campaign_settings where id='sugar-november-2026' for update;
 if c.revision<>p_revision then raise exception 'campaign_changed';end if;
 if p_enabled and(c.launch_date is null or c.launch_date<current_date or c.launch_date>date '2027-01-31') then raise exception 'invalid_launch_date';end if;
 if p_enabled and not exists(select 1 from program_messages where kind='automatic' and state in('draft','scheduled','queued','missed')) then raise exception 'no_automatic_messages';end if;
 if p_enabled and exists(select 1 from program_messages where kind='automatic' and state in('draft','scheduled','missed') and(subject like '%[DOPLŇ%' or body like '%[DOPLŇ%')) then raise exception 'unfinished_messages';end if;
 if p_enabled then
  update program_messages set due_at=((c.launch_date-days_before)+send_time) at time zone 'Europe/Bratislava',
   state=case when ((c.launch_date-days_before)+send_time) at time zone 'Europe/Bratislava'<=now() then 'missed' else 'scheduled' end
   where kind='automatic' and state in('draft','scheduled','missed');
 end if;
 update program_campaign_settings set enabled=p_enabled,revision=revision+1 where id=c.id;
end $$;
create function public.program_message_queue(p_id uuid,p_revision integer) returns integer language plpgsql set search_path=public as $$
declare m program_messages;n integer;
begin
 select * into m from program_messages where id=p_id for update;
 if m.kind<>'manual' or m.state<>'draft' or m.revision<>p_revision then raise exception 'message_locked_or_changed';end if;
 if m.subject like '%[DOPLŇ%' or m.body like '%[DOPLŇ%' then raise exception 'unfinished_messages';end if;
 insert into program_deliveries(message_id,interest_id) select m.id,id from program_interest where state='confirmed' on conflict do nothing;
 get diagnostics n=row_count;if n=0 then raise exception 'no_confirmed_recipients';end if;
 update program_messages set state='queued',due_at=now(),revision=revision+1 where id=m.id;return n;
end $$;
create function public.program_campaign_prepare() returns integer language plpgsql set search_path=public as $$
declare c program_campaign_settings;m program_messages;n integer:=0;
begin
 select * into c from program_campaign_settings where id='sugar-november-2026' for update skip locked;
 if not found or not c.enabled then return 0;end if;
 update program_messages set state='missed' where kind='automatic' and state='scheduled' and due_at<now()-interval '2 hours';
 update program_deliveries d set state='skipped',error='send_window_expired',finished_at=now() from program_messages msg where d.message_id=msg.id and msg.kind='automatic' and d.state='queued' and msg.due_at<now()-interval '2 hours';
 for m in select * from program_messages where kind='automatic' and state='scheduled' and due_at<=now() and due_at>=now()-interval '2 hours' for update skip locked loop
  insert into program_deliveries(message_id,interest_id) select m.id,id from program_interest where state='confirmed' on conflict do nothing;
  update program_messages set state=case when exists(select 1 from program_deliveries where message_id=m.id) then 'queued' else 'completed' end where id=m.id;n:=n+1;
 end loop;return n;
end $$;
create function public.program_delivery_claim(p_limit integer default 10) returns jsonb language plpgsql set search_path=public as $$
declare result jsonb;
begin
 update program_deliveries set state='review',error='interrupted_delivery_check_brevo',unsubscribe_token=null where state='processing' and claimed_at<now()-interval '5 minutes';
 update program_deliveries d set state='skipped',finished_at=now(),error='recipient_removed' where d.state='queued' and not exists(select 1 from program_interest i where i.id=d.interest_id and i.state='confirmed');
 with chosen as(select d.id,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') token from program_deliveries d join program_messages m on m.id=d.message_id join program_interest i on i.id=d.interest_id cross join program_campaign_settings c where d.state='queued' and m.state='queued' and i.state='confirmed' and(m.kind='manual' or(c.enabled and m.due_at>=now()-interval '2 hours')) order by d.created_at limit least(greatest(p_limit,1),10) for update of d skip locked),
 claimed as(update program_deliveries d set state='processing',lease=gen_random_uuid(),claimed_at=now(),unsubscribe_token=chosen.token,unsubscribe_hash=encode(sha256(chosen.token::bytea),'hex') from chosen where d.id=chosen.id returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'lease',d.lease,'kind',m.kind,'interestId',d.interest_id,'email',i.email,'token',d.unsubscribe_token,'subject',m.subject,'body',m.body,'buttonText',m.button_text,'buttonUrl',m.button_url,'launchDate',c.launch_date,'campaignName',c.name)), '[]'::jsonb) into result from claimed d join program_messages m on m.id=d.message_id join program_interest i on i.id=d.interest_id cross join program_campaign_settings c;
 return result;
end $$;
create function public.program_delivery_release(p_id uuid,p_lease uuid) returns void language sql set search_path=public as $$
 update program_deliveries set state='queued',lease=null,claimed_at=null,unsubscribe_token=null,unsubscribe_hash=null where id=p_id and lease=p_lease and state='processing';
$$;
revoke all on function public.program_delivery_release(uuid,uuid) from public,anon,authenticated;
grant execute on function public.program_delivery_release(uuid,uuid) to service_role;
create function public.program_delivery_finish(p_id uuid,p_lease uuid,p_state text,p_provider text default null,p_error text default null) returns void language plpgsql set search_path=public as $$
begin
 if p_state not in('sent','failed','review','skipped') then raise exception 'invalid_state';end if;
 update program_deliveries set state=p_state,provider_id=left(p_provider,300),error=left(p_error,200),finished_at=now(),unsubscribe_token=null where id=p_id and lease=p_lease and state='processing';
 if not found then raise exception 'delivery_lease_lost';end if;
 update program_messages m set state='completed' where state='queued' and not exists(select 1 from program_deliveries d where d.message_id=m.id and d.state in('queued','processing'));
end $$;
create or replace function public.program_interest_unsubscribe(p_hash text) returns boolean language plpgsql set search_path=public as $$
begin
 delete from program_interest i where unsubscribe_hash=p_hash or exists(select 1 from program_deliveries d where d.interest_id=i.id and d.unsubscribe_hash=p_hash);return true;
end $$;
create function public.program_campaign_overview() returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('campaign',(select to_jsonb(c) from program_campaign_settings c),'confirmed',(select count(*) from program_interest where state='confirmed'),'pending',(select count(*) from program_interest where state='pending'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('stats',coalesce((select jsonb_object_agg(s.state,s.n) from(select d.state,count(*) n from program_deliveries d where d.message_id=m.id group by d.state)s),'{}'::jsonb)) order by m.created_at desc) from program_messages m where state<>'archived'),'[]'::jsonb));
$$;
revoke all on function public.program_campaign_overview() from public,anon,authenticated;
grant execute on function public.program_campaign_overview() to service_role;
revoke all on function public.program_campaign_save(text,date),public.program_message_save(uuid,integer,text,text,text,text,text,integer,time),public.program_message_archive(uuid,integer),public.program_campaign_toggle(boolean,integer),public.program_message_queue(uuid,integer),public.program_campaign_prepare(),public.program_delivery_claim(integer),public.program_delivery_finish(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.program_campaign_save(text,date),public.program_message_save(uuid,integer,text,text,text,text,text,integer,time),public.program_message_archive(uuid,integer),public.program_campaign_toggle(boolean,integer),public.program_message_queue(uuid,integer),public.program_campaign_prepare(),public.program_delivery_claim(integer),public.program_delivery_finish(uuid,uuid,text,text,text) to service_role;
