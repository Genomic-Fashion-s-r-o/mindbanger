-- Spustite tento skript v sekcii "SQL Editor" v administrácii Vášho Supabase projektu.

-- 1. Pridá stĺpec 'role' s predvolenou hodnotou 'user', ak ešte neexistuje.
alter table if exists public.profiles
  add column if not exists role text default 'user';

-- 2. Bezpečnostná kontrola, či je stĺpec správny.
comment on column public.profiles.role is 'Role of the user: "user" | "admin"';
