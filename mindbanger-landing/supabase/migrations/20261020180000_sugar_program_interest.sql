-- Separate, consent-based interest list; existing clients and reservations are untouched.
create table public.program_interest (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(length(email)<=254 and email=lower(email)),
 campaign text not null default 'sugar-november-2026' check(campaign='sugar-november-2026'),
 state text not null default 'pending' check(state in ('pending','confirmed','unsubscribed')),
 consent_version text not null default 'sugar-interest-2026-10-20',
 requested_at timestamptz not null default now(), confirmed_at timestamptz,
 confirm_hash text unique, unsubscribe_hash text unique,
 expires_at timestamptz not null default now()+interval '24 hours'
);
create table public.program_interest_limits (bucket text primary key, count integer not null, expires_at timestamptz not null);
alter table public.program_interest enable row level security;
alter table public.program_interest_limits enable row level security;
revoke all on public.program_interest, public.program_interest_limits from public,anon,authenticated;
grant select,insert,update,delete on public.program_interest,public.program_interest_limits to service_role;
create function public.program_interest_request(p_email text,p_confirm text,p_unsubscribe text,p_bucket text) returns boolean language plpgsql set search_path=public as $$
declare n integer; b public.program_interest;
begin
 delete from program_interest_limits where expires_at<now();
 insert into program_interest_limits values(p_bucket,1,now()+interval '1 hour') on conflict(bucket) do update set count=program_interest_limits.count+1 returning count into n;
 if n>6 then return false;end if;
 insert into program_interest(email,confirm_hash,unsubscribe_hash) values(p_email,p_confirm,p_unsubscribe) on conflict(email) do nothing;
 select * into b from program_interest where email=p_email for update;
 if b.state='confirmed' then return false;end if;
 if b.confirm_hash<>p_confirm and b.requested_at>now()-interval '1 minute' then return false;end if;
 update program_interest set state='pending',confirm_hash=p_confirm,unsubscribe_hash=p_unsubscribe,requested_at=now(),expires_at=now()+interval '24 hours',consent_version='sugar-interest-2026-10-20' where id=b.id;
 return true;
end $$;
create function public.program_interest_confirm(p_hash text) returns boolean language plpgsql set search_path=public as $$
declare n integer;
begin
 update program_interest set state='confirmed',confirmed_at=coalesce(confirmed_at,now()) where confirm_hash=p_hash and expires_at>now() and state in('pending','confirmed');
 get diagnostics n=row_count;return n=1;
end $$;
create function public.program_interest_unsubscribe(p_hash text) returns boolean language plpgsql set search_path=public as $$
begin
 delete from program_interest where unsubscribe_hash=p_hash;return true;
end $$;
create function public.program_interest_purge() returns void language sql set search_path=public as $$
 delete from program_interest where (state='pending' and requested_at<now()-interval '7 days') or now()>timestamptz '2027-02-01 00:00:00+01';
 delete from program_interest_limits where expires_at<now();
$$;
revoke all on function public.program_interest_request(text,text,text,text),public.program_interest_confirm(text),public.program_interest_unsubscribe(text),public.program_interest_purge() from public,anon,authenticated;
grant execute on function public.program_interest_request(text,text,text,text),public.program_interest_confirm(text),public.program_interest_unsubscribe(text),public.program_interest_purge() to service_role;
