-- =============================================================================
-- JUJUTSU FLOW — database setup for accounts + sync
--
-- Paste this whole file into Supabase: SQL Editor → New query → Run.
-- It is safe to run again (it only creates what's missing).
--
-- The idea: one table, "records". Every note, journal entry, video link,
-- flashcard and setting is one small row, tagged with its owner. Row-level
-- security (RLS) is the lock on each drawer: a signed-in person can only ever
-- see or change rows whose user_id is their own.
-- =============================================================================

create table if not exists public.records (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('note', 'journal', 'video', 'card', 'setting')),
  key        text not null check (char_length(key) between 1 and 200),
  data       jsonb,                                   -- null when deleted
  deleted    boolean not null default false,          -- deletions are kept as tiny "tombstones" so other devices hear about them
  changed_at bigint not null,                         -- when the person made the change (their device's clock, ms)
  server_at  timestamptz not null default now(),      -- when the server received it (set by the trigger below)
  primary key (user_id, kind, key),
  constraint record_size check (pg_column_size(data) < 100000)   -- one record can't be huge
);

create index if not exists records_user_server_at on public.records (user_id, server_at);

-- ---- The lock: row-level security ---------------------------------------------
alter table public.records enable row level security;
alter table public.records force row level security;

-- Nobody who isn't signed in gets anything at all.
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

drop policy if exists "read own records"   on public.records;
drop policy if exists "add own records"    on public.records;
drop policy if exists "change own records" on public.records;
drop policy if exists "remove own records" on public.records;

create policy "read own records"   on public.records for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own records"    on public.records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "change own records" on public.records for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "remove own records" on public.records for delete to authenticated using ((select auth.uid()) = user_id);

-- ---- The server stamps every write with its own clock --------------------------
-- (Devices ask "what changed since I last looked?" using this, so a phone with
-- a wrong clock can't make changes go missing.)
create or replace function public.stamp_server_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.server_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists records_stamp on public.records;
create trigger records_stamp before insert or update on public.records
  for each row execute function public.stamp_server_at();

-- ---- "Delete my account" --------------------------------------------------------
-- Deletes the signed-in person's records and their login. It can only ever
-- delete the account of whoever calls it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  delete from public.records where user_id = me;
  delete from auth.users where id = me;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
