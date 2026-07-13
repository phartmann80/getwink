-- GetWink Patch 002B Hardening
-- Restrict AI usage audit writes to trusted server-side code.
-- Apply after 0001_getwink_core.sql.
-- Do not edit the already-applied 0001 migration.

begin;

-- Remove the client insert policy created by Patch 001B.
drop policy if exists ai_usage_self_insert on public.ai_usage_events;

-- Authenticated clients may not forge, modify, or delete audit events.
revoke insert on table public.ai_usage_events from authenticated;
revoke update on table public.ai_usage_events from authenticated;
revoke delete on table public.ai_usage_events from authenticated;

-- Keep authenticated SELECT access only if the product needs users to view
-- their own usage history. The existing RLS policy limits rows to auth.uid().
-- No client write policy is recreated here.

commit;
