-- GetWink Patch 003A: Atomic profile preference saving
-- Date: 2026-08-08
-- Purpose:
--   - Replace the mobile client's broken upsert (array value into a
--     single-value enum column, ON CONFLICT on user_id only when the real
--     unique constraint is (user_id, interested_in)).
--   - Provide a security-definer RPC that derives the acting user from
--     auth.uid(), validates and deduplicates the requested values, and
--     replaces that user's preference rows transactionally.
--   - Force all writes to public.profile_preferences through the RPC so the
--     server, not the client, is authoritative for this data.
-- Apply after 0001_getwink_core.sql and 0002_restrict_ai_usage_event_inserts.sql.
-- Do not edit the already-applied 0001 or 0002 migrations.

begin;

create or replace function public.save_profile_preferences(
  p_interested_in public.profile_gender[],
  p_min_age integer default null,
  p_max_age integer default null
)
returns setof public.profile_preferences
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_values public.profile_gender[];
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;
  if p_interested_in is null or array_length(p_interested_in, 1) is null then
    raise exception 'At least one preference value is required';
  end if;

  -- Deduplicate the requested values; array element type already restricts
  -- membership to valid public.profile_gender values.
  select array_agg(distinct v) into v_values from unnest(p_interested_in) as v;

  -- Replace this user's preference rows atomically. Delete + insert inside
  -- this function's implicit transaction is idempotent: retrying with the
  -- same arguments always ends in the same state.
  delete from public.profile_preferences where user_id = v_actor;

  return query
  insert into public.profile_preferences (user_id, interested_in, min_age, max_age)
  select v_actor, x, p_min_age, p_max_age
  from unnest(v_values) as x
  returning *;
end;
$$;

grant execute on function public.save_profile_preferences(public.profile_gender[], integer, integer) to authenticated;

-- All future writes must go through the RPC above. Direct client writes are
-- removed the same way Patch 002B removed them for ai_usage_events.
drop policy if exists profile_preferences_write_self on public.profile_preferences;
revoke insert on public.profile_preferences from authenticated;
revoke update on public.profile_preferences from authenticated;
revoke delete on public.profile_preferences from authenticated;
-- profile_preferences_select_self (SELECT) and the table-level SELECT grant
-- from 0001 are left in place; reads are unaffected.

commit;
