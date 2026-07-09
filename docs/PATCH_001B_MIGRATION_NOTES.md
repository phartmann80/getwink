# GetWink Patch 001B — Corrected Core Supabase Migration

Patch 001 bootstrapped the empty repository successfully, but the migration file in that ZIP may be a placeholder. Patch 001B replaces `supabase/migrations/0001_getwink_core.sql` with the real MVP database foundation.

Included:

- profiles
- profile_photos
- profile_preferences
- discovery_actions
- matches
- conversations
- messages
- message_read_state
- user_entitlements
- user_blocks
- user_reports
- user_safety_actions
- ai_conversations
- ai_messages
- ai_usage_events
- account_deletion_requests
- RLS policies and grants
- RPCs for profile completion, Wink/Pass, block, report, and account deletion request

Apply this only after Patch 001 is present in the repo.
