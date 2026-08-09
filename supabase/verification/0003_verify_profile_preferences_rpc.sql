-- Verification queries for Patch 003A atomic profile preference saving.
-- Run after 0003_atomic_profile_preferences.sql.

-- 1. Confirm the client write policy is absent.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'profile_preferences'
order by policyname;

-- Expected: only profile_preferences_select_self (SELECT) remains.

-- 2. Confirm table grants for authenticated.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'profile_preferences'
  and grantee = 'authenticated'
order by privilege_type;

-- Expected: SELECT only. INSERT, UPDATE, DELETE must not be present.

-- 3. Confirm the RPC exists and is executable by authenticated.
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'save_profile_preferences';

select grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name = 'save_profile_preferences'
  and grantee = 'authenticated';

-- 4. Positive test (run as an authenticated user via the client, or with
--    request.jwt.claims set to that user's sub for a direct SQL check):
--    select * from public.save_profile_preferences(array['woman','man']::public.profile_gender[]);
--    Expect exactly 2 rows for auth.uid(), unique on (user_id, interested_in).

-- 5. Idempotency check: call the same RPC again with the same array.
--    Expect the same 2 rows, no duplicate-key errors.

-- 6. Dedupe check: call with array['woman','woman','man'].
--    Expect exactly 2 rows (woman, man), not 3.

-- 7. Cross-user negative check: there is no user-id parameter to spoof.
--    Confirm calling as user A only ever affects rows where user_id = A
--    by re-running query 4's select filtered to a known other user's id
--    and confirming zero rows were touched.

-- 8. Confirm is_profile_complete() still sees preference rows after the
--    grant revocation (it is SECURITY DEFINER and unaffected by grants to
--    authenticated, but verify behaviorally):
--    select public.is_profile_complete('<test-user-uuid>');
