-- Client identity is independent from legacy Daily membership.
alter table public.profiles enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
    execute format('drop policy %I on public.profiles',p.policyname);
  end loop;
end $$;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update(full_name,avatar_url,username,bio,preferred_language,timezone,notification_time) on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy profile_owner_read on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy profile_owner_edit on public.profiles for update to authenticated
  using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy profile_admin_read on public.profiles for select to authenticated using (
  (select auth.jwt()->>'aal')='aal2' and lower((select auth.jwt()->>'email')) in ('miroslav.jobus@gmail.com','jobusmiro@gmail.com')
);

-- Protect existing admin policies even if a legacy profile role was tampered with.
do $$ declare p record; q text; w text; admin_check text := $expr$((select auth.jwt()->>'aal')='aal2' and lower((select auth.jwt()->>'email')) in ('miroslav.jobus@gmail.com','jobusmiro@gmail.com'))$expr$;
begin
  for p in select * from pg_policies where schemaname='public' and tablename<>'profiles'
    and (coalesce(qual,'') like '%profiles.role%' or coalesce(with_check,'') like '%profiles.role%') loop
    -- Preserve team membership predicates; replace only profile-based admin tests.
    q := p.qual; w := p.with_check;
    if q is not null then
      q := regexp_replace(q, '\(\( SELECT profiles\.role[[:space:]]+FROM profiles[[:space:]]+WHERE \(profiles\.id = auth\.uid\(\)\)\) = ''admin''::text\)', admin_check, 'g');
      q := replace(q, '(profiles.role = ''admin''::text)', '(' || admin_check || ')');
    end if;
    if w is not null then
      w := regexp_replace(w, '\(\( SELECT profiles\.role[[:space:]]+FROM profiles[[:space:]]+WHERE \(profiles\.id = auth\.uid\(\)\)\) = ''admin''::text\)', admin_check, 'g');
      w := replace(w, '(profiles.role = ''admin''::text)', '(' || admin_check || ')');
    end if;
    execute format('alter policy %I on public.%I%s%s',p.policyname,p.tablename,
      case when q is null then '' else ' using ('||q||')' end,
      case when w is null then '' else ' with check ('||w||')' end);
  end loop;
end $$;

-- Legacy company membership and billing are managed by server routes only.
revoke insert,update,delete on public.organizations,public.organization_members from public,anon,authenticated;
drop policy if exists "Admins can manage all individual recordings" on public.individual_recordings;
create policy recordings_verified_admin on public.individual_recordings for all to authenticated
  using ((select auth.jwt()->>'aal')='aal2' and lower((select auth.jwt()->>'email')) in ('miroslav.jobus@gmail.com','jobusmiro@gmail.com'))
  with check ((select auth.jwt()->>'aal')='aal2' and lower((select auth.jwt()->>'email')) in ('miroslav.jobus@gmail.com','jobusmiro@gmail.com'));

do $$ begin
  if exists(select 1 from pg_policies where schemaname='public' and
    (coalesce(qual,'') like '%profiles.role%' or coalesce(with_check,'') like '%profiles.role%')) then
    raise exception 'Unconverted legacy administrator policy';
  end if;
end $$;

alter table public.appointments add column user_id uuid references auth.users(id) on delete set null;
create index appointments_client_next_idx on public.appointments(user_id,starts_at) where user_id is not null;

create table public.client_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null, accepted_at timestamptz not null default now(),
  primary key(user_id,version)
);
alter table public.client_consents enable row level security;
revoke all on public.client_consents from public,anon,authenticated;
grant all on public.client_consents to service_role;

create table public.processed_stripe_events (
  id text primary key, event_type text not null,
  status text not null check(status in ('processing','completed','failed')),
  lease_token uuid not null, lease_until timestamptz,
  attempts integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.processed_stripe_events enable row level security;
revoke all on public.processed_stripe_events from public,anon,authenticated;
grant all on public.processed_stripe_events to service_role;
create function public.claim_stripe_event(p_id text,p_type text,p_token uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare e public.processed_stripe_events;
begin
  insert into public.processed_stripe_events(id,event_type,status,lease_token,lease_until)
    values(p_id,p_type,'processing',p_token,now()+interval '10 minutes') on conflict(id) do nothing;
  select * into e from public.processed_stripe_events where id=p_id for update;
  if e.status='completed' then return 'completed'; end if;
  if e.lease_token=p_token then return 'claimed'; end if;
  if e.status='processing' and e.lease_until>now() then return 'busy'; end if;
  update public.processed_stripe_events set status='processing',lease_token=p_token,
    lease_until=now()+interval '10 minutes',attempts=attempts+1,updated_at=now() where id=p_id;
  return 'claimed';
end $$;
revoke all on function public.claim_stripe_event(text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_stripe_event(text,text,uuid) to service_role;
