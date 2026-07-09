-- GetWink Patch 001B: Core MVP Supabase schema
-- Date: 2026-07-09
-- Purpose:
--   - Replace the Patch 001 placeholder migration.
--   - Create MVP tables, enums, RLS policies, and transaction-safe RPCs.
--   - Trial starts once when profile onboarding becomes complete.
--   - Mutual Wink -> Match is idempotent and protected by canonical unique constraints.

create extension if not exists pgcrypto;

do $$ begin create type public.profile_gender as enum ('woman', 'man', 'non_binary', 'other', 'prefer_not_to_say'); exception when duplicate_object then null; end $$;
do $$ begin create type public.discovery_action_type as enum ('wink', 'pass'); exception when duplicate_object then null; end $$;
do $$ begin create type public.match_status as enum ('active', 'blocked', 'closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.conversation_type as enum ('match', 'ai'); exception when duplicate_object then null; end $$;
do $$ begin create type public.message_sender_type as enum ('user', 'assistant', 'system'); exception when duplicate_object then null; end $$;
do $$ begin create type public.entitlement_status as enum ('beta_trial', 'active', 'expired', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.entitlement_source as enum ('profile_completion_trial', 'manual_admin', 'future_subscription'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_reason as enum ('harassment', 'spam', 'fake_profile', 'inappropriate_content', 'underage', 'scam', 'safety_concern', 'other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.safety_action_type as enum ('block', 'unblock', 'report', 'account_warning', 'account_suspension', 'account_deletion_requested'); exception when duplicate_object then null; end $$;
do $$ begin create type public.account_status as enum ('active', 'deactivated', 'deletion_requested', 'deleted', 'suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.ai_feature_type as enum ('general_assistant', 'onboarding_guidance', 'profile_creation', 'bio_improvement', 'conversation_opener', 'reply_suggestion', 'safety_guidance', 'reporting_support'); exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  gender public.profile_gender,
  bio text,
  birthdate date,
  city text,
  country text,
  onboarding_completed_at timestamptz,
  account_status public.account_status not null default 'active',
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len check (display_name is null or char_length(display_name) between 1 and 80),
  constraint profiles_bio_len check (bio is null or char_length(bio) <= 500),
  constraint profiles_birthdate_adult_or_empty check (birthdate is null or birthdate <= current_date - interval '18 years')
);
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  public_url text,
  sort_order integer not null default 0,
  moderation_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, storage_path),
  constraint profile_photos_sort_nonnegative check (sort_order >= 0)
);
create index if not exists idx_profile_photos_user_sort on public.profile_photos(user_id, sort_order);

create table if not exists public.profile_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  interested_in public.profile_gender not null,
  min_age integer,
  max_age integer,
  created_at timestamptz not null default now(),
  unique (user_id, interested_in),
  constraint profile_preferences_age_check check ((min_age is null or min_age >= 18) and (max_age is null or max_age >= 18) and (min_age is null or max_age is null or min_age <= max_age))
);
create index if not exists idx_profile_preferences_user on public.profile_preferences(user_id);
create index if not exists idx_profile_preferences_gender on public.profile_preferences(interested_in);

create table if not exists public.user_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status public.entitlement_status not null default 'beta_trial',
  source public.entitlement_source not null default 'profile_completion_trial',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  future_subscription_provider text,
  future_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entitlement_trial_dates check (trial_ends_at is null or trial_started_at is not null)
);
drop trigger if exists trg_user_entitlements_updated_at on public.user_entitlements;
create trigger trg_user_entitlements_updated_at before update on public.user_entitlements for each row execute function public.set_updated_at();

create table if not exists public.discovery_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  action public.discovery_action_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discovery_no_self_action check (actor_user_id <> target_user_id),
  unique (actor_user_id, target_user_id)
);
drop trigger if exists trg_discovery_actions_updated_at on public.discovery_actions;
create trigger trg_discovery_actions_updated_at before update on public.discovery_actions for each row execute function public.set_updated_at();
create index if not exists idx_discovery_actions_actor on public.discovery_actions(actor_user_id);
create index if not exists idx_discovery_actions_target_action on public.discovery_actions(target_user_id, action);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  status public.match_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_canonical_order check (user_low_id < user_high_id),
  unique (user_low_id, user_high_id)
);
drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at before update on public.matches for each row execute function public.set_updated_at();
create index if not exists idx_matches_low on public.matches(user_low_id);
create index if not exists idx_matches_high on public.matches(user_high_id);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type public.conversation_type not null,
  match_id uuid unique references public.matches(id) on delete cascade,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_match_required check ((conversation_type = 'match' and match_id is not null) or (conversation_type = 'ai' and match_id is null))
);
drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid references public.profiles(id) on delete set null,
  sender_type public.message_sender_type not null default 'user',
  content text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_content_len check (char_length(content) between 1 and 4000)
);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);

create table if not exists public.message_read_state (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unblocked_at timestamptz,
  constraint blocks_no_self check (blocker_user_id <> blocked_user_id),
  unique (blocker_user_id, blocked_user_id)
);
create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_user_id) where unblocked_at is null;
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_user_id) where unblocked_at is null;

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_no_self check (reporter_user_id <> reported_user_id),
  constraint report_details_len check (details is null or char_length(details) <= 2000)
);
drop trigger if exists trg_user_reports_updated_at on public.user_reports;
create trigger trg_user_reports_updated_at before update on public.user_reports for each row execute function public.set_updated_at();
create index if not exists idx_user_reports_status_created on public.user_reports(status, created_at);
create index if not exists idx_user_reports_reported on public.user_reports(reported_user_id);

create table if not exists public.user_safety_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action public.safety_action_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_safety_actions_target on public.user_safety_actions(target_user_id, created_at);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature public.ai_feature_type not null default 'general_assistant',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_ai_conversations_updated_at on public.ai_conversations;
create trigger trg_ai_conversations_updated_at before update on public.ai_conversations for each row execute function public.set_updated_at();
create index if not exists idx_ai_conversations_user_created on public.ai_conversations(user_id, created_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  ai_conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  sender_type public.message_sender_type not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_messages_content_len check (char_length(content) between 1 and 8000)
);
create index if not exists idx_ai_messages_conversation_created on public.ai_messages(ai_conversation_id, created_at);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  ai_conversation_id uuid references public.ai_conversations(id) on delete set null,
  feature public.ai_feature_type not null,
  provider text,
  model text,
  status text not null,
  latency_ms integer,
  request_started_at timestamptz not null default now(),
  request_finished_at timestamptz,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  constraint ai_usage_status_check check (status in ('success', 'failure')),
  constraint ai_usage_latency_check check (latency_ms is null or latency_ms >= 0)
);
create index if not exists idx_ai_usage_user_started on public.ai_usage_events(user_id, request_started_at desc);
create index if not exists idx_ai_usage_feature_started on public.ai_usage_events(feature, request_started_at desc);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  scheduled_delete_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_account_deletion_user on public.account_deletion_requests(user_id, requested_at desc);

create or replace function public.is_profile_complete(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and coalesce(trim(p.display_name), '') <> ''
      and p.gender is not null
      and coalesce(trim(p.bio), '') <> ''
      and exists (select 1 from public.profile_preferences pref where pref.user_id = p_user_id)
      and exists (select 1 from public.profile_photos photo where photo.user_id = p_user_id)
  );
$$;

create or replace function public.users_are_blocked(p_user_a uuid, p_user_b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_blocks b
    where b.unblocked_at is null
      and ((b.blocker_user_id = p_user_a and b.blocked_user_id = p_user_b) or (b.blocker_user_id = p_user_b and b.blocked_user_id = p_user_a))
  );
$$;

create or replace function public.complete_profile_if_ready(p_user_id uuid default auth.uid())
returns table(profile_complete boolean, trial_started boolean, trial_ends_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_complete boolean;
  v_existing_started_at timestamptz;
  v_existing_ends_at timestamptz;
  v_now timestamptz := now();
begin
  if p_user_id is null then raise exception 'Not authenticated'; end if;
  if p_user_id <> auth.uid() then raise exception 'Cannot complete another user profile'; end if;
  v_complete := public.is_profile_complete(p_user_id);
  if not v_complete then return query select false, false, null::timestamptz; return; end if;
  update public.profiles set onboarding_completed_at = coalesce(onboarding_completed_at, v_now) where id = p_user_id;
  select ue.trial_started_at, ue.trial_ends_at into v_existing_started_at, v_existing_ends_at from public.user_entitlements ue where ue.user_id = p_user_id for update;
  if v_existing_started_at is null then
    insert into public.user_entitlements (user_id, status, source, trial_started_at, trial_ends_at)
    values (p_user_id, 'beta_trial', 'profile_completion_trial', v_now, v_now + interval '30 days')
    on conflict (user_id) do update set trial_started_at = coalesce(public.user_entitlements.trial_started_at, excluded.trial_started_at), trial_ends_at = coalesce(public.user_entitlements.trial_ends_at, excluded.trial_ends_at), updated_at = now()
    returning public.user_entitlements.trial_ends_at into v_existing_ends_at;
    return query select true, true, v_existing_ends_at; return;
  end if;
  return query select true, false, v_existing_ends_at;
end;
$$;

create or replace function public.record_discovery_action(p_target_user_id uuid, p_action public.discovery_action_type)
returns table(action_id uuid, matched boolean, match_id uuid, conversation_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_action_id uuid;
  v_reverse_wink_exists boolean := false;
  v_low uuid;
  v_high uuid;
  v_match_id uuid;
  v_conversation_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if p_target_user_id is null or p_target_user_id = v_actor then raise exception 'Invalid discovery target'; end if;
  if public.users_are_blocked(v_actor, p_target_user_id) then raise exception 'Discovery action not allowed'; end if;
  if not public.is_profile_complete(v_actor) then raise exception 'Complete your profile before discovery'; end if;
  if not public.is_profile_complete(p_target_user_id) then raise exception 'Target profile is not discoverable'; end if;
  insert into public.discovery_actions(actor_user_id, target_user_id, action)
  values (v_actor, p_target_user_id, p_action)
  on conflict (actor_user_id, target_user_id) do update set action = excluded.action, updated_at = now()
  returning id into v_action_id;
  if p_action = 'wink' then
    select exists (select 1 from public.discovery_actions da where da.actor_user_id = p_target_user_id and da.target_user_id = v_actor and da.action = 'wink') into v_reverse_wink_exists;
    if v_reverse_wink_exists then
      v_low := least(v_actor, p_target_user_id);
      v_high := greatest(v_actor, p_target_user_id);
      insert into public.matches(user_low_id, user_high_id, status) values (v_low, v_high, 'active')
      on conflict (user_low_id, user_high_id) do update set updated_at = public.matches.updated_at returning id into v_match_id;
      insert into public.conversations(conversation_type, match_id, created_by_user_id) values ('match', v_match_id, v_actor)
      on conflict (match_id) do update set updated_at = public.conversations.updated_at returning id into v_conversation_id;
    end if;
  end if;
  return query select v_action_id, (v_match_id is not null), v_match_id, v_conversation_id;
end;
$$;

create or replace function public.block_user(p_blocked_user_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_block_id uuid; v_low uuid; v_high uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if p_blocked_user_id is null or p_blocked_user_id = v_actor then raise exception 'Invalid blocked user'; end if;
  insert into public.user_blocks(blocker_user_id, blocked_user_id, reason, unblocked_at) values (v_actor, p_blocked_user_id, p_reason, null)
  on conflict (blocker_user_id, blocked_user_id) do update set reason = excluded.reason, unblocked_at = null, created_at = now() returning id into v_block_id;
  v_low := least(v_actor, p_blocked_user_id); v_high := greatest(v_actor, p_blocked_user_id);
  update public.matches set status = 'blocked', updated_at = now() where user_low_id = v_low and user_high_id = v_high;
  insert into public.user_safety_actions(actor_user_id, target_user_id, action, metadata) values (v_actor, p_blocked_user_id, 'block', jsonb_build_object('reason_present', p_reason is not null));
  return v_block_id;
end;
$$;

create or replace function public.report_user(p_reported_user_id uuid, p_reason public.report_reason, p_details text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_report_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  if p_reported_user_id is null or p_reported_user_id = v_actor then raise exception 'Invalid reported user'; end if;
  insert into public.user_reports(reporter_user_id, reported_user_id, reason, details) values (v_actor, p_reported_user_id, p_reason, p_details) returning id into v_report_id;
  insert into public.user_safety_actions(actor_user_id, target_user_id, action, metadata) values (v_actor, p_reported_user_id, 'report', jsonb_build_object('reason', p_reason));
  return v_report_id;
end;
$$;

create or replace function public.request_account_deletion(p_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_request_id uuid;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;
  update public.profiles set account_status = 'deletion_requested', deletion_requested_at = coalesce(deletion_requested_at, now()) where id = v_actor;
  insert into public.account_deletion_requests(user_id, scheduled_delete_at, reason) values (v_actor, now() + interval '30 days', p_reason) returning id into v_request_id;
  insert into public.user_safety_actions(actor_user_id, target_user_id, action, metadata) values (v_actor, v_actor, 'account_deletion_requested', jsonb_build_object('reason_present', p_reason is not null));
  return v_request_id;
end;
$$;

create or replace view public.discovery_candidate_profiles as
select p.id, p.display_name, p.gender, p.bio, p.city, p.country, p.created_at, p.updated_at
from public.profiles p
where p.account_status = 'active' and p.onboarding_completed_at is not null;

alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.discovery_actions enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_read_state enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;
alter table public.user_safety_actions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists profiles_select_discoverable_or_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profile_photos_select_visible on public.profile_photos;
drop policy if exists profile_photos_write_self on public.profile_photos;
drop policy if exists profile_preferences_select_self on public.profile_preferences;
drop policy if exists profile_preferences_write_self on public.profile_preferences;
drop policy if exists entitlements_select_self on public.user_entitlements;
drop policy if exists discovery_actions_select_self on public.discovery_actions;
drop policy if exists discovery_actions_insert_self on public.discovery_actions;
drop policy if exists discovery_actions_update_self on public.discovery_actions;
drop policy if exists matches_select_participant on public.matches;
drop policy if exists conversations_select_participant on public.conversations;
drop policy if exists messages_select_match_participant on public.messages;
drop policy if exists messages_insert_match_participant on public.messages;
drop policy if exists message_read_state_self on public.message_read_state;
drop policy if exists user_blocks_self on public.user_blocks;
drop policy if exists user_reports_insert_self on public.user_reports;
drop policy if exists user_reports_select_own_reports on public.user_reports;
drop policy if exists safety_actions_select_self_related on public.user_safety_actions;
drop policy if exists ai_conversations_self on public.ai_conversations;
drop policy if exists ai_messages_self_conversation on public.ai_messages;
drop policy if exists ai_usage_self_select on public.ai_usage_events;
drop policy if exists ai_usage_self_insert on public.ai_usage_events;
drop policy if exists account_deletion_self on public.account_deletion_requests;

create policy profiles_select_discoverable_or_self on public.profiles for select to authenticated using (id = auth.uid() or (account_status = 'active' and onboarding_completed_at is not null and not public.users_are_blocked(auth.uid(), id)));
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profile_photos_select_visible on public.profile_photos for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = profile_photos.user_id and p.account_status = 'active' and p.onboarding_completed_at is not null and not public.users_are_blocked(auth.uid(), p.id)));
create policy profile_photos_write_self on public.profile_photos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profile_preferences_select_self on public.profile_preferences for select to authenticated using (user_id = auth.uid());
create policy profile_preferences_write_self on public.profile_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy entitlements_select_self on public.user_entitlements for select to authenticated using (user_id = auth.uid());
create policy discovery_actions_select_self on public.discovery_actions for select to authenticated using (actor_user_id = auth.uid());
create policy discovery_actions_insert_self on public.discovery_actions for insert to authenticated with check (actor_user_id = auth.uid());
create policy discovery_actions_update_self on public.discovery_actions for update to authenticated using (actor_user_id = auth.uid()) with check (actor_user_id = auth.uid());
create policy matches_select_participant on public.matches for select to authenticated using (auth.uid() in (user_low_id, user_high_id));
create policy conversations_select_participant on public.conversations for select to authenticated using (conversation_type = 'match' and exists (select 1 from public.matches m where m.id = conversations.match_id and auth.uid() in (m.user_low_id, m.user_high_id)));
create policy messages_select_match_participant on public.messages for select to authenticated using (exists (select 1 from public.conversations c join public.matches m on m.id = c.match_id where c.id = messages.conversation_id and c.conversation_type = 'match' and auth.uid() in (m.user_low_id, m.user_high_id) and m.status = 'active' and not public.users_are_blocked(m.user_low_id, m.user_high_id)));
create policy messages_insert_match_participant on public.messages for insert to authenticated with check (sender_user_id = auth.uid() and sender_type = 'user' and exists (select 1 from public.conversations c join public.matches m on m.id = c.match_id where c.id = messages.conversation_id and c.conversation_type = 'match' and auth.uid() in (m.user_low_id, m.user_high_id) and m.status = 'active' and not public.users_are_blocked(m.user_low_id, m.user_high_id)));
create policy message_read_state_self on public.message_read_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_blocks_self on public.user_blocks for all to authenticated using (blocker_user_id = auth.uid()) with check (blocker_user_id = auth.uid());
create policy user_reports_insert_self on public.user_reports for insert to authenticated with check (reporter_user_id = auth.uid());
create policy user_reports_select_own_reports on public.user_reports for select to authenticated using (reporter_user_id = auth.uid());
create policy safety_actions_select_self_related on public.user_safety_actions for select to authenticated using (actor_user_id = auth.uid() or target_user_id = auth.uid());
create policy ai_conversations_self on public.ai_conversations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_messages_self_conversation on public.ai_messages for all to authenticated using (exists (select 1 from public.ai_conversations c where c.id = ai_messages.ai_conversation_id and c.user_id = auth.uid())) with check (exists (select 1 from public.ai_conversations c where c.id = ai_messages.ai_conversation_id and c.user_id = auth.uid()));
create policy ai_usage_self_select on public.ai_usage_events for select to authenticated using (user_id = auth.uid());
create policy ai_usage_self_insert on public.ai_usage_events for insert to authenticated with check (user_id = auth.uid());
create policy account_deletion_self on public.account_deletion_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_photos to authenticated;
grant select, insert, update, delete on public.profile_preferences to authenticated;
grant select on public.user_entitlements to authenticated;
grant select, insert, update on public.discovery_actions to authenticated;
grant select on public.matches to authenticated;
grant select on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update on public.message_read_state to authenticated;
grant select, insert, update on public.user_blocks to authenticated;
grant select, insert on public.user_reports to authenticated;
grant select on public.user_safety_actions to authenticated;
grant select, insert, update on public.ai_conversations to authenticated;
grant select, insert on public.ai_messages to authenticated;
grant select, insert on public.ai_usage_events to authenticated;
grant select, insert, update on public.account_deletion_requests to authenticated;
grant execute on function public.complete_profile_if_ready(uuid) to authenticated;
grant execute on function public.record_discovery_action(uuid, public.discovery_action_type) to authenticated;
grant execute on function public.block_user(uuid, text) to authenticated;
grant execute on function public.report_user(uuid, public.report_reason, text) to authenticated;
grant execute on function public.request_account_deletion(text) to authenticated;
