# Patch 003A acceptance matrix

Supersedes nothing in `PATCH_003_TEST_MATRIX.md`; adds correction-specific coverage.
Items marked **[staging]** require the joint Supabase Auth dashboard change
(Site URL + `getwink://auth/callback` redirect) before they can run and must
not be attempted against production until that change and this patch's
migrations are applied to a staging project.

## Preference save (migration 0003)

| Area | Verification | Expected |
|---|---|---|
| RPC | `save_profile_preferences(['woman','man'])` as user A | Exactly 2 rows for A, no error |
| Idempotency | Call again with the same array | Same 2 rows, no duplicate-key error |
| Dedupe | Call with `['woman','woman','man']` | Exactly 2 rows, not 3 |
| Negative | Direct `insert`/`update`/`delete` on `profile_preferences` as an authenticated client | Rejected — grants revoked, RPC is the only write path |
| Cross-user | Attempt to affect another user's rows | Structurally impossible — RPC takes no user-id parameter, derives actor from `auth.uid()` only |
| Regression | `is_profile_complete()` / `complete_profile_if_ready()` after grant revocation | Still see preference rows correctly (SECURITY DEFINER, unaffected by authenticated grants) |

## Photo save idempotency

| Area | Verification | Expected |
|---|---|---|
| First save | Onboarding with a photo | One `profile_photos` row, one storage object |
| Re-save (edit) | Change the photo later | Still exactly one `profile_photos` row for the user; old storage object removed only after the new upload + row succeed |
| Retry after failure | Simulate a failed row upsert after a successful upload | Previous photo/row untouched; user never left without a photo |

## Email confirmation deep link **[staging]**

| Area | Verification | Expected |
|---|---|---|
| Sign up | New account, no session returned | Confirmation-pending screen shown with working "resend" |
| Cold start | Kill app, tap real confirmation email link | App launches, shows "Confirming your email...", then signed-in state |
| Foreground | App open, tap real confirmation email link | Same exchange succeeds without relaunch |
| Reused link | Tap the same confirmation link twice | Second attempt shows the expired/reused recovery screen, not a generic error |
| Expired link | Tap a link past Supabase's expiry window | Expired recovery screen shown |
| Logging | `adb logcat` during the whole flow | No confirmation URL, code, or access/refresh token appears in logs |

## Two-device Android QA

Run the full positive matrix from `PATCH_003_TEST_MATRIX.md` plus the tables
above on two physical devices spanning Android 12+ and Android 14+, against
the real Supabase project and `https://www.getwink.app` API base, using a
signed EAS preview build. Record per-device pass/fail plus `adb logcat`
confirmation of no sensitive logging.
