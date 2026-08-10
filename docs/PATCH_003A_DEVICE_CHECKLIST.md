# Patch 003A — device QA checklist (for Paul, physical Android device)

This is a step-by-step script, no development experience required. Each row
says exactly what to tap and what you should see. Take a screenshot on any
FAIL and note which row it was.

**Build to install:** STAGING-QA v2 — link below, or scan the QR code on the
build page. **Do not share this link or forward the APK to anyone else** —
it's a test build pointed at a throwaway staging database, not production.

> Install link: https://expo.dev/accounts/janpaul80/projects/getwink/builds/8ccd3f90-ba7b-43db-b761-77a0a0d64462

**Two test accounts already exist and are ready to use** — you don't need to
create new ones:

| Account | Password |
|---|---|
| `getwink-qa1@outlook.com` | `GetWinkQA2026!` |
| `k.emre05@outlook.com` | `GetWinkQA2026!` |

Both are pre-confirmed, so you can sign in directly with "Sign in" (not
"Create beta account").

---

## 1. Onboarding photo fix (re-verify)

This is the row that failed before the fix — the most important one to
re-check first.

1. Open the app, sign in as `getwink-qa1@outlook.com`.
2. Fill in the onboarding fields (any values are fine) and choose a profile
   photo when prompted, crop it, confirm.
3. Scroll down, tap **Complete profile**.
   - **PASS**: you land on the Discover screen (a card-based browsing view),
     no error dialog.
   - **FAIL**: a "Could not save" dialog appears. Screenshot it.

## 2. Preference-save idempotency

1. From the Discover/Home screen, go to the **Profile** tab, tap
   **Edit profile**.
2. Change the bio text slightly, tap **Complete profile** again.
   - **PASS**: saves without error, returns to Home.
3. Repeat step 2 once more (edit again, save again).
   - **PASS**: still saves without error both times — this proves saving
     twice in a row never breaks anything.

## 3. Photo replace + cleanup

1. From **Profile → Edit profile**, choose a *different* photo than before,
   crop, confirm, tap **Complete profile**.
   - **PASS**: saves without error, and the new photo shows on your Profile
     tab.
2. No visual way to confirm the *old* photo was deleted from storage — that
   part is confirmed on our side after this step; you don't need to do
   anything extra here beyond confirming the save itself succeeded.

## 4. Sequential two-user match + chat

Real-time simultaneity on two devices isn't part of this pass — this
sequential version on one device is an accepted adaptation, documented as
such. The underlying match/chat logic already passed automated staging
tests; this row is about confirming the on-device UI reflects it correctly.

1. Make sure **both** accounts have completed onboarding (repeat step 1 for
   `k.emre05@outlook.com` if you haven't already, with any photo).
2. Signed in as `getwink-qa1@outlook.com`: go to **Discover**, find
   `k.emre05`'s card, tap **Wink**.
   - **PASS**: no error; card moves on (no "It's a match!" yet — expected,
     since the other side hasn't winked back).
3. Sign out (**Profile → Sign out**), sign in as `k.emre05@outlook.com`.
4. Go to **Discover**, find `getwink-qa1`'s card, tap **Wink**.
   - **PASS**: an "It's a match!" alert appears immediately.
5. Go to the **Matches** tab.
   - **PASS**: `getwink-qa1` appears as a match; tap it to open chat.
6. Send a message (e.g. "hello from k.emre").
   - **PASS**: message appears in the chat thread.
7. Sign out, sign back in as `getwink-qa1@outlook.com`, go to **Matches**,
   open the chat with `k.emre05`.
   - **PASS**: you see `k.emre05`'s message from step 6. Send a reply.
   - **PASS**: your reply sends without error.

## 5. Block / report

Still signed in as `getwink-qa1@outlook.com`, in the chat from step 4.7:

1. Tap **Safety** (top right of the chat screen).
2. Tap **Block**.
   - **PASS**: returns to the previous screen without error.
3. Go to **Matches**.
   - **PASS**: `k.emre05` no longer appears in the match list.
4. Go to **Discover**.
   - **PASS**: `k.emre05` never appears as a candidate again.

## 6. Deep-link happy path — parked

**Skip this row for now.** It's intentionally on hold until the staging
SMTP setup (Resend) is finished — the default mailer is rate-limited to
~2 emails/hour, which is why device farm testing couldn't complete it
either. Once SMTP is live, this becomes:

1. Sign up a **fresh** email address you can check on this same phone.
2. Without opening the app again, open your mail app, find the GetWink
   confirmation email, tap the link.
   - **PASS**: the app opens directly to a signed-in state (this is the
     "cold start" case).
3. Sign out. Sign up again with another fresh email. This time, **keep the
   app open** and switch to your mail app in the background, tap the link
   from there.
   - **PASS**: the app comes to the foreground already signed in (the
     "foreground" case), without needing to relaunch it.
4. Tap the **same** confirmation link a second time (from either test).
   - **PASS**: a "That link expired" or "That link did not work" screen
     appears — not a crash, not a blank error.

## 7. Optional — log check (only if you're comfortable with this)

This confirms no confirmation link, code, or session token ever appears in
the device logs. Only relevant once you've run section 6 above.

1. Enable Developer Options on the phone if not already (Settings → About
   phone → tap "Build number" 7 times).
2. Connect the phone to a computer with `adb` installed (or ask for help
   with this step — it's the only one that needs a computer).
3. Run: `adb logcat | grep -i "getwink://\|access_token\|refresh_token"`
   while repeating section 6.
   - **PASS**: no matches — the confirmation link, its code, and any
     session tokens never appear in the log output.

---

## Reporting back

For each numbered section: PASS/FAIL, and for any FAIL, a screenshot plus
which step number. That's everything needed for the final report.
