-- Read acknowledgement is admin-only through the existing service-role API.
-- Answered state and this NULL marker commit together, including teen RPC submissions.
alter table public.coaching_client_records add column reviewed_at timestamptz;
create index coaching_unread_questionnaires on public.coaching_client_records(updated_at desc)
 where kind='questionnaire' and state='answered' and reviewed_at is null;
