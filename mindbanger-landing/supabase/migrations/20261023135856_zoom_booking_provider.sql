-- Existing appointments retain their original provider, including pending jobs.
alter table public.appointments add column meeting_provider text not null default 'google_meet'
 check (meeting_provider in ('google_meet','zoom'));

create table public.appointment_zoom_connection (
 id integer primary key check(id=1), encrypted_credentials text not null,
 host_email text not null, host_type integer not null,
 active boolean not null default false, tested_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.appointment_zoom_meetings (
 appointment_id uuid primary key references public.appointments(id) on delete cascade,
 state text not null default 'queued' check(state in ('queued','creating','ready','review','cancelled')),
 lease uuid, lease_until timestamptz, meeting_id text unique, join_url text,
 updated_at timestamptz not null default now(),
 check (meeting_id is null or meeting_id ~ '^[0-9]{9,12}$')
);
alter table public.appointment_zoom_connection enable row level security;
alter table public.appointment_zoom_meetings enable row level security;
revoke all on public.appointment_zoom_connection,public.appointment_zoom_meetings from public,anon,authenticated;
grant all on public.appointment_zoom_connection,public.appointment_zoom_meetings to service_role;

create function public.appointment_choose_video_provider() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if new.kind='booking' then
  if exists(select 1 from public.appointment_zoom_connection where id=1 and active and tested_at is not null) then
   new.meeting_provider:='zoom';
  else new.meeting_provider:='google_meet';end if;
 end if;return new;
end $$;
revoke all on function public.appointment_choose_video_provider() from public,anon,authenticated;
grant execute on function public.appointment_choose_video_provider() to service_role;
create trigger appointment_video_provider before insert on public.appointments
 for each row execute function public.appointment_choose_video_provider();

-- A durable create lease prevents duplicate meetings after timeout or worker crash.
-- Ambiguous creation must be inspected rather than POSTed again.
create function public.appointment_zoom_begin(p_id uuid) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare m public.appointment_zoom_meetings;l uuid;
begin
 if not exists(select 1 from public.appointments where id=p_id and meeting_provider='zoom') then raise exception 'zoom_booking_required';end if;
 insert into public.appointment_zoom_meetings(appointment_id) values(p_id) on conflict do nothing;
 select * into strict m from public.appointment_zoom_meetings where appointment_id=p_id for update;
 if m.meeting_id is not null then return jsonb_build_object('mode','existing','meetingId',m.meeting_id,'joinUrl',m.join_url);end if;
 if m.state='creating' and m.lease_until>now() then return jsonb_build_object('mode','wait');end if;
 if m.state in ('creating','review','cancelled') then
  update public.appointment_zoom_meetings set state='review',updated_at=now() where appointment_id=p_id;
  return jsonb_build_object('mode','review');
 end if;
 l:=gen_random_uuid();update public.appointment_zoom_meetings set state='creating',lease=l,lease_until=now()+interval '2 minutes',updated_at=now() where appointment_id=p_id;
 return jsonb_build_object('mode','create','lease',l);
end $$;
revoke all on function public.appointment_zoom_begin(uuid) from public,anon,authenticated;
grant execute on function public.appointment_zoom_begin(uuid) to service_role;

create or replace function public.appointment_finish_video(p_id uuid,p_lease uuid,p_revision timestamptz,p_event text,p_url text,p_cancelled boolean)
 returns void language plpgsql security invoker set search_path='' as $$
declare job public.appointment_video_jobs;b public.appointments;valid_url boolean;
begin
 perform pg_advisory_xact_lock(710071);
 select * into job from public.appointment_video_jobs where appointment_id=p_id for update;
 if not found or job.lease is distinct from p_lease then return;end if;
 select * into strict b from public.appointments where id=p_id for update;
 if job.revision is distinct from p_revision then
  update public.appointment_video_jobs set lease=null,lease_until=null,available_at=now() where appointment_id=p_id;return;
 end if;
 valid_url:=case when b.meeting_provider='zoom' then
  p_url ~ '^https://([a-z0-9-]+[.])?zoom[.]us/j/[0-9]{9,12}([?]pwd=[A-Za-z0-9._~-]{1,255})?$'
  and exists(select 1 from public.appointment_zoom_meetings m where m.appointment_id=p_id and m.state='ready' and 'zoom:'||m.meeting_id=p_event and m.join_url=p_url)
 else p_url ~ '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}$' end;
 if p_cancelled then update public.appointments set meeting_url=null,meeting_state='cancelled' where id=p_id;
 elsif b.status='confirmed' and (b.paid or b.funding_type='manual') and p_url is not null and valid_url then
  update public.appointments set meeting_url=p_url,meeting_event_id=p_event,meeting_state='ready',updated_at=now() where id=p_id;
  perform public.appointment_enqueue(p_id,'confirmed');
 else raise exception 'video_state_changed';end if;
 delete from public.appointment_video_jobs where appointment_id=p_id;
end $$;
revoke all on function public.appointment_finish_video(uuid,uuid,timestamptz,text,text,boolean) from public,anon,authenticated;
grant execute on function public.appointment_finish_video(uuid,uuid,timestamptz,text,text,boolean) to service_role;
