# Patch 003A — staging test results

Run 2026-08-09 against a dedicated staging project (`getwink-staging`,
ref `zxpbgtwoenqiwcirjdlx`, org `zfzangagmwlqbtdkalsa`), created solely for
this pass. Never linked to, read from, or written to the production project
(`uuswuaaebkwehhckkmbt`).

## Setup
- Migrations `0001_getwink_core.sql` through `0004_profile_photos_storage_policies.sql` applied via `supabase db push`, in order, no errors.
- Auth config set via Management API to match the joint production change: `site_url = https://www.getwink.app`, `uri_allow_list = getwink://auth/callback`. Confirmed saved via API read-back.
- Two confirmed test users created via the Auth Admin API, each with a matching `profiles` row (mirroring what the app's `saveProfile()` does before ever calling the preferences RPC).

## Structural verification (`supabase/verification/0003_*`, `0004_*`)
All expected: `profile_preferences` grants for `authenticated` show no INSERT/UPDATE/DELETE; `save_profile_preferences` is `SECURITY DEFINER` with `EXECUTE` granted; bucket config matches spec (`public=false`, 5 MB limit, `image/jpeg,image/png,image/webp`); all three storage policies present with no stray UPDATE policy.

One observation, not a defect: `authenticated` also holds `REFERENCES`/`TRIGGER`/`TRUNCATE` on `profile_preferences`. This is a Supabase platform-wide default-privilege template applied to every table in the project equally, not something migration 0003 controls, and not reachable through PostgREST/RPC (no client API exposes `TRUNCATE`).

## RPC test pass — 6/6 passed

| Test | Result |
|---|---|
| Positive: 2 distinct values -> 2 rows | PASS |
| Idempotency: repeat call -> same 2 rows, no error | PASS |
| Dedupe: duplicate input -> exactly 2 distinct rows | PASS |
| Negative: direct INSERT on `profile_preferences` rejected | PASS (403) |
| Cross-user isolation: B writing never touches A's rows | PASS |
| Negative: empty array rejected | PASS (400, explicit message) |

One setup-only finding along the way, not a product defect: the RPC initially returned `409` / `23503` (foreign key violation) because the test users existed in `auth.users` but had no `profiles` row yet — the real app always creates that row via `saveProfile()`'s profile upsert before calling the preferences RPC. Adding the equivalent setup step in the test resolved it. Confirms the foreign key is doing its job.

## Storage policy test pass — 11/11 passed

| Test | Result |
|---|---|
| Own upload succeeds | PASS |
| Own signed URL succeeds | PASS |
| Cross-user upload rejected | PASS |
| Cross-user delete rejected | PASS |
| Cross-user read rejected while target not onboarded | PASS |
| Cross-user read succeeds once target is active/onboarded/not blocked | PASS |
| `block_user` RPC succeeds | PASS |
| Cross-user read rejected after block | PASS |
| Oversized upload (6 MB > 5 MB limit) rejected | PASS (413) |
| Disallowed MIME type (`application/pdf`) rejected | PASS (415) |
| Own delete succeeds | PASS |

This exercises the full visibility lifecycle the migration 0004 comment describes: private-by-default, self always visible, others visible only once discoverable, and visibility revoked immediately on block.

## Deep-link Auth config — partially covered

Confirmed via Management API read-back that `site_url` and `uri_allow_list` are saved exactly as specified. Confirmed via code review (prior session) that `signUp()` passes `emailRedirectTo: 'getwink://auth/callback'`. **Not exercised**: an actual confirmation email tap-through (cold start / foreground / expired / reused), since that needs a real inbox and a physical device — this is intentionally deferred to the two-device QA phase rather than approximated here.

## Not yet run
Two-device Android QA, EAS preview build, `adb logcat` no-token-logging confirmation — all next per the agreed sequencing.
