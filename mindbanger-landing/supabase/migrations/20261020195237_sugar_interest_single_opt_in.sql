-- New registrations become eligible after the explicit form consent.
-- Existing pending registrations are left pending until they submit again.
create function public.program_interest_register(p_email text,p_unsubscribe text,p_bucket text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 delete from program_interest_limits where expires_at<now();
 insert into program_interest_limits values(p_bucket,1,now()+interval '1 hour')
 on conflict(bucket) do update set count=program_interest_limits.count+1 returning count into n;
 if n>6 then return false;end if;
 insert into program_interest(email,state,confirmed_at,confirm_hash,unsubscribe_hash,consent_version)
 values(p_email,'confirmed',now(),null,p_unsubscribe,'sugar-interest-form-2026-10-20')
 on conflict(email) do update set
 state='confirmed',confirmed_at=coalesce(program_interest.confirmed_at,now()),
 confirm_hash=null,unsubscribe_hash=coalesce(program_interest.unsubscribe_hash,excluded.unsubscribe_hash),
 requested_at=case when program_interest.state='confirmed' then program_interest.requested_at else now() end,
 consent_version=case when program_interest.state='confirmed' then program_interest.consent_version else excluded.consent_version end;
 return true;
end $$;
revoke all on function public.program_interest_register(text,text,text) from public,anon,authenticated;
grant execute on function public.program_interest_register(text,text,text) to service_role;
