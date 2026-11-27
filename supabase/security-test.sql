-- =============================================================================
-- JUJUTSU FLOW — security test
--
-- Run this AFTER schema.sql: SQL Editor → New query → paste → Run.
-- It makes two pretend users (A and B), has B try to snoop on and damage A's
-- data, then deletes both pretend users. Every row in the result must say
-- PASS. If anything says FAIL, don't let people sign up until it's fixed.
-- =============================================================================

-- Clean up from any earlier run.
reset role;
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
drop table if exists pg_temp.results;
create temp table results (n serial, test text, ok boolean);
grant insert, select on results to authenticated, anon;
grant usage on sequence results_n_seq to authenticated, anon;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.invalid', 'authenticated', 'authenticated');

-- ---- Signed in as A: write a private journal entry --------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', false);
insert into public.records (user_id, kind, key, data, changed_at)
  values ('00000000-0000-4000-8000-00000000000a', 'journal', 'a1', '{"text":"A''s private entry"}', 1);
insert into results (test, ok) select 'A can read their own entry', count(*) = 1 from public.records;

-- ---- Signed in as B: try to get at A's data ------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', false);
insert into results (test, ok) select 'B cannot see A''s entry', count(*) = 0 from public.records;

with hit as (update public.records set data = '{"text":"hacked"}' where key = 'a1' returning 1)
insert into results (test, ok) select 'B cannot change A''s entry', count(*) = 0 from hit;

with hit as (delete from public.records where key = 'a1' returning 1)
insert into results (test, ok) select 'B cannot delete A''s entry', count(*) = 0 from hit;

do $$ begin
  insert into public.records (user_id, kind, key, data, changed_at)
    values ('00000000-0000-4000-8000-00000000000a', 'journal', 'planted', '{"text":"planted by B"}', 1);
  insert into results (test, ok) values ('B cannot write into A''s account', false);
exception when others then
  insert into results (test, ok) values ('B cannot write into A''s account', true);
end $$;

insert into public.records (user_id, kind, key, data, changed_at)
  values ('00000000-0000-4000-8000-00000000000b', 'journal', 'b1', '{"text":"B''s entry"}', 1);
do $$ declare moved int; begin
  update public.records set user_id = '00000000-0000-4000-8000-00000000000a' where key = 'b1';
  get diagnostics moved = row_count;
  insert into results (test, ok) values ('B cannot hand a record over to A', moved = 0);
exception when others then
  insert into results (test, ok) values ('B cannot hand a record over to A', true);
end $$;

select public.delete_my_account();   -- B deletes B's own account…

-- ---- Not signed in at all ---------------------------------------------------------
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ begin
  perform count(*) from public.records;
  insert into results (test, ok) values ('Signed-out visitors cannot read anything', false);
exception when others then
  insert into results (test, ok) values ('Signed-out visitors cannot read anything', true);
end $$;
do $$ begin
  perform public.delete_my_account();
  insert into results (test, ok) values ('Signed-out visitors cannot delete accounts', false);
exception when others then
  insert into results (test, ok) values ('Signed-out visitors cannot delete accounts', true);
end $$;

-- ---- Back to the admin view: check what really happened ----------------------------
reset role;
select set_config('request.jwt.claims', '', false);
insert into results (test, ok) select '…which left A''s entry untouched',
  count(*) = 1 from public.records where key = 'a1' and data->>'text' = 'A''s private entry';
insert into results (test, ok) select '…and A''s account still exists',
  count(*) = 1 from auth.users where id = '00000000-0000-4000-8000-00000000000a';
insert into results (test, ok) select 'B''s delete really removed B',
  count(*) = 0 from auth.users where id = '00000000-0000-4000-8000-00000000000b';
insert into results (test, ok) select 'Row-level security is switched on',
  relrowsecurity from pg_class where oid = 'public.records'::regclass;

delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');

select n, test, case when ok then 'PASS' else 'FAIL' end as result from results order by n;
