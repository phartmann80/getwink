-- Verification queries for Patch 002B hardening.
-- Run after 0002_restrict_ai_usage_event_inserts.sql.

-- 1. Confirm the client insert policy is absent.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'ai_usage_events'
order by policyname;

-- Expected: no INSERT policy for role authenticated.

-- 2. Confirm table grants for authenticated.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'ai_usage_events'
  and grantee = 'authenticated'
order by privilege_type;

-- Expected: SELECT may remain. INSERT, UPDATE, DELETE must not be present.

-- 3. Confirm the own-row read policy remains, if user-facing usage history is desired.
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'ai_usage_events'
  and policyname = 'ai_usage_self_select';

-- 4. Confirm the table exists.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'ai_usage_events';
