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

## EAS builds

| Build | ID | Role | Points at |
|---|---|---|---|
| Release candidate | `3f9b1227-766d-48f8-900c-7daeea69dd41` | Built before the photo-upload fix landed; superseded, do not use for final acceptance | Production Supabase |
| STAGING-QA v1 | `0ab7f76e-cf98-4005-bcd8-fb4d6117498c` | First device-QA build; found the photo-upload defect | `getwink-staging` |
| STAGING-QA diagnostic | `9564e352-8fa3-4c02-96de-2a4614bc8fb7` | Temporary, carried the diagnostic logging commit (`9a34077`, now reverted); never distributed, superseded | `getwink-staging` |
| STAGING-QA v2 (current) | see below | Contains the photo-upload fix (`85f0de5`); this is the build for Paul's device checklist | `getwink-staging` |

All STAGING-QA builds are internal-distribution, staging-pointed, and were never linked from any download surface — **never distribute**. All were built via an uncommitted local `eas.json` profile override (staging URL/anon key inline), reverted immediately after each build consumed it; `apps/mobile/eas.json` on the branch has never carried a staging-pointing profile.

## Device QA (BrowserStack App Automate, Free trial)

Ran against STAGING-QA v1, device: Samsung Galaxy S22, Android 12 (`hashed_id d338c37c10349f996849d3c90a7af9febe9bde5d` for the run that found the defect; `a006f0dc56c29252e9d2f272aeb4e34d0641ad06` for the deep-link cold-start/foreground/reused-link run). Test accounts: `getwink-qa1@outlook.com` (`dc7d83a3-fb85-4bf7-a8dd-71e907458af6`) and `k.emre05@outlook.com` (`93a118ac-5179-487d-8240-02bcf98f2ac4`), both admin-confirmed server-side to bypass the default-mailer rate limit.

**Verified working, real device:**
- Real sign-up through the app UI reaches the confirmation-pending screen with the correct email interpolated and a working resend button.
- Password sign-in (after admin-confirming email) reaches onboarding cleanly.
- Onboarding form fill, the native Android photo picker, and the native crop-confirmation screen all work correctly.
- Cold-start and foreground deep-link handling are resilient: the app never crashes, always shows the intended graceful recovery screen.
- `save_profile_preferences` (migration 0003) works correctly through the real app flow, not just via API — confirmed via direct DB read after a real onboarding attempt (see defect below).

**Deep-link happy path — structural finding, not a defect.** Admin-API-generated links (`auth.admin.generateLink`) cannot complete `exchangeCodeForSession()`: the app's PKCE flow requires a `code_verifier` that only exists when the app itself initiates the request (via `signUp()`), which the admin API bypasses entirely. Both cold-start and foreground attempts against admin-generated links landed on the same graceful "That link did not work" recovery screen — accepted as a genuine pass for error-path resilience, but **not** proof of the happy path. The "reused link" test is reclassified from pass to inconclusive, since the link never succeeded even once. The true happy path can only be proven with a real email delivered to the same device that initiated the sign-up — deferred to the staging SMTP rehearsal, then re-run on Paul's device.

**Defect found and fixed: onboarding photo upload.** Reproducible 2/2 on real device: `profiles` and `profile_preferences` writes both succeeded (fresh rows, correct data, confirmed via direct DB query), but no `profile_photos` row or storage object was ever created — generic "Network request failed" surfaced to the user. Root cause: `fetch(localUri).blob()` followed by re-uploading that `Blob` is a documented React Native failure pattern (Supabase's own RN storage guide warns against it); never caught by earlier API-level tests because those uploaded a blob directly from a script, never through the real picker → crop → local-file-read path. **Fixed in `85f0de5`**: reads the file natively via `expo-file-system`'s `File.arrayBuffer()` and uploads the `ArrayBuffer` directly, bypassing RN's fetch/Blob layer. Also aligned the client-side size guard from 10 MB to 5 MB to match the storage policy's actual limit. Diagnostic logging added to confirm (`9a34077`) was reverted (`beca613`) once no longer needed.

**BrowserStack Free trial testing time was exhausted mid-session** before the fix could be re-verified on the farm. Remaining device verification (this fix, plus preference-save idempotency, photo replace/cleanup, match/chat, block/report, negative rows, and log capture) moves to Paul's physical Android device — see `docs/PATCH_003A_DEVICE_CHECKLIST.md`.
