# Walkthrough - GetWink Patch 002D.1 Avatar Integration & Visual Verification

This document details the configuration, visual styles, avatar authorization, component integration, and test verification for **Patch 002D.1: Complete Landing Avatars and Visual Verification**.

---

## 1. Avatar Authorization & Licensing Record

All four profile avatar assets used across the landing page are AI-generated demonstration personas created for GetWink UI mockups:

| Avatar Asset | Persona | Details | Authorization / Licensing |
|---|---|---|---|
| [`public/avatar_maya.jpg`](file:///c:/Users/hartm/getwink/public/avatar_maya.jpg) | Maya, 28 | Vienna · coffee walks | AI-generated demonstration avatar for GetWink UI mockups (Patch 002D.1). Does not represent a real person or active member. No third-party stock license required. |
| [`public/avatar_sofia.jpg`](file:///c:/Users/hartm/getwink/public/avatar_sofia.jpg) | Sofia, 30 | Berlin · travel stories | AI-generated demonstration avatar for GetWink UI mockups (Patch 002D.1). Does not represent a real person or active member. No third-party stock license required. |
| [`public/avatar_liam.jpg`](file:///c:/Users/hartm/getwink/public/avatar_liam.jpg) | Liam, 27 | Munich · bouldering & jazz | AI-generated demonstration avatar for GetWink UI mockups (Patch 002D.1). Does not represent a real person or active member. No third-party stock license required. |
| [`public/avatar_noah.jpg`](file:///c:/Users/hartm/getwink/public/avatar_noah.jpg) | Noah, 29 | Hamburg · vintage vinyl | AI-generated demonstration avatar for GetWink UI mockups (Patch 002D.1). Does not represent a real person or active member. No third-party stock license required. |

*All names and attributes are fictional UI demonstration data.*

---

## 2. Component & Layout Implementation

- **Hero Video Component ([HeroVideo.tsx](file:///c:/Users/hartm/getwink/app/components/HeroVideo.tsx))**:
  - Encapsulates `<video>` with `autoPlay`, `muted`, `loop`, `playsInline`, `preload="auto"`, and fallback poster [`public/getwink-hero-person.png`](file:///c:/Users/hartm/getwink/public/getwink-hero-person.png).
  - **Reduced Motion Handling**: Monitors `(prefers-reduced-motion: reduce)` via media query listeners. When active, it halts video playback and renders a clean static poster image to prevent continuous motion.
- **Avatar Image Integration ([app/page.tsx](file:///c:/Users/hartm/getwink/app/page.tsx))**:
  - Replaced single-letter placeholder initial elements (`M`, `S`, `L`) with real image tags (`<img>`).
  - Integrated avatars into floating discovery profile card (*Maya*), floating message badge (*Sofia*), story intro active card (*Liam*), and the 4-card mixed-gender discovery stack (*Maya*, *Sofia*, *Liam*, *Noah*).
  - Applied explicit `width` and `height` attributes and `object-fit: cover` styling ([globals.css](file:///c:/Users/hartm/getwink/app/styles/globals.css)) to ensure layout stability and zero CLS (Cumulative Layout Shift).
- **Disabled APK CTA**:
  - Verified `NEXT_PUBLIC_ANDROID_APK_URL` check. Renders disabled label `"Android beta coming soon"` with non-interactive styling while URL targets the placeholder `https://getwink.app/download/beta.apk`.

---

## 3. Test & Verification Results

### Automated Build & Typecheck
- **TypeScript (`npm run typecheck`)**: **PASSED** (0 errors).
- **Next.js Production Build (`npm run build`)**: **PASSED** (Static pages and dynamic routes compiled cleanly).

### Security & Route Regression Suite
- **Test Runner (`lib/mastra/run-mastra-auth-tests.ts`)**: **22 PASSED, 0 FAILED**.
  - Unauthenticated request rejection (HTTP 401)
  - Bearer token authentication & Supabase verification
  - User ID spoofing isolation & audit logging mapping
  - Suspended user access block (HTTP 401)
  - Payload size limits (>100KB -> HTTP 413)
  - RLS client write permission denials (INSERT/UPDATE/DELETE blocked on `ai_usage_events`)
  - Server-side service-role audit insertion (HTTP 200 OK)
  - Secret leakage scanning & environment variable safety

### Health API Route Verification
- **`GET /api/health`**: HTTP 200 OK (`{"ok":true,"service":"getwink","timestamp":"..."}`) with `Cache-Control: no-store`.
- **`POST /api/health`**: HTTP 405 Method Not Allowed with header `Allow: GET`.

---

## 4. Responsive Visual Matrix

Visual responsiveness verified across all target viewport widths:

| Width | Status | Observation |
|---|---|---|
| **1440px** | PASSED | Full editorial backdrop, balanced floating cards, video centered in black swell. |
| **1280px** | PASSED | Header, navigation, hero title, and floating profiles perfectly proportioned. |
| **1024px** | PASSED | Stack and section copy scale smoothly without wrapping issues. |
| **768px** | PASSED | Single-column story and intelligence transition, cards clear video. |
| **430px** | PASSED | Mobile floating card position overrides clear video bounds cleanly. |
| **390px** | PASSED | Zero horizontal scroll overflow; buttons and footer remain readable. |
| **360px** | PASSED | Minimal mobile viewport renders all copy, avatars, and legal links legibly. |

---

## 5. Deployment & Delivery

- **Branch**: `patch-002d-landing-page-clone`
- **Commit**: `Patch 002D.1: complete landing avatars and visual verification`
- **Source Snapshot**: Created clean source archive `GetWink-Post-002D1-Source.zip` containing all codebase files, documentation, video assets, and avatars (excluding `.git`, `node_modules`, `.next`, and `.env` secrets).

---

# Walkthrough - GetWink Patch 003 (in progress) - Android beta APK & self-hosted deployment

**Branch:** `patch-003-android-apk-and-server-deploy`

> Status: this patch is **awaiting approval** on the emulator decision and the server runtime
> before the APK build, APK hosting, and Vercel->self-host migration proceed. The sections below
> record the environment setup and pre-build verification that are already complete. All secret
> values are shown as `<configured>` placeholders and are never committed.

## P3.1 Environment setup (Cloud Agent)

- Node `v22.14.0`, npm `10.9.7`, JDK `21.0.10`, `gh` `2.91.0` present on the default image; no
  custom system packages required for web dev or mobile bundling/EAS.
- Repository dev environment committed at [`.cursor/environment.json`](.cursor/environment.json):
  `install` runs `npm ci` (web root) + `npm --prefix apps/mobile ci`; the Next.js dev server is a
  visible `web-dev` terminal.
- `npm ci` verified idempotent for both packages (second run produced no lockfile drift).

| Check | Result |
|---|---|
| `npm ci` (web) + `npm --prefix apps/mobile ci` | Passed (idempotent, no lock drift) |
| Web `npm run typecheck` (`tsc --noEmit`) | Passed (0 errors) |
| Web `npm run build` (Next 16, Turbopack) | Passed (10 routes compiled) |
| Web dev server routes `/`, `/privacy`, `/terms`, `/safety` | HTTP 200 |
| `GET /api/health` | HTTP 200 JSON, `Cache-Control: no-store, no-cache, must-revalidate` |
| `POST /api/health` | HTTP 405, `Allow: GET` |
| Mobile `npm run typecheck` | Passed (0 errors) |
| Mobile `npx expo-doctor` | 20/20 checks passed |
| Mobile Android JS bundle (`expo export`) | Passed (651 modules -> 2.4MB Hermes `.hbc`) |

## P3.2 expo-doctor / dependency alignment (commit `17801a1`)

`expo-doctor` initially failed one check (patch-version mismatches). Fixed via `expo install --fix`:

| Package | Before | After (expected by SDK 55) |
|---|---|---|
| `react-native` | 0.83.6 | 0.83.10 |
| `expo` | ~55.0.28 | ~55.0.30 |
| `expo-image-picker` | ~55.0.22 | ~55.0.24 |
| `expo-secure-store` | ~55.0.16 | ~55.0.18 |

After the fix: `expo-doctor` 20/20 and `tsc --noEmit` both pass.

## P3.3 Android emulator feasibility - BLOCKED (hardware virtualization)

A hardware-accelerated AVD **cannot** run on this Cloud Agent VM. Evidence
([artifact](/opt/cursor/artifacts/emulator-feasibility.txt)):

- VM: Ubuntu 24.04, kernel 6.12, x86_64, 4 vCPU, 15 GiB RAM, 227 GiB free.
- Android SDK cmdline-tools + `platform-tools` + `emulator` + `system-images;android-34;google_apis;x86_64`
  installed; AVD `getwink_test` (Pixel 6, API 34) created.
- `emulator -accel-check` reports "KVM (version 12) is installed and usable" (device/ioctl probe only).
- On boot with `-enable-kvm`, qemu holds `/dev/kvm` open but accrues ~0s CPU over 8+ minutes; the
  device stays `offline` and no guest kernel executes.
- Root cause in host `dmesg`: `kernel BUG at arch/x86/kvm/x86.c:702!` /
  `kvm_spurious_fault` in `vmx_vcpu_create` -> `kvm_vm_ioctl_create_vcpu` - nested KVM crashes on
  vCPU creation, so the guest never runs. Software (TCG) emulation of a full Android 34 image is not
  a practical substitute for interactive smoke testing.

**Fallback (approved):** build the EAS preview APK, then run the interactive smoke test on a
**cloud real-device** service (Firebase Test Lab preferred, else BrowserStack App Live or Genymotion
SaaS) with recording. Physical-device re-verification is optional and not a blocker. Metro bundling
for Android is verified working here.

## P3.4 Lint gate migrated to ESLint flat config (commit `dca7795`)

Next 16 removed `next lint`. `"lint"` is now `eslint .` with `eslint.config.mjs`. Because
`eslint-config-next@16` ships **native flat configs**, they are composed directly
(`...nextCoreWebVitals`, `...nextTypescript`); `FlatCompat` is only for legacy `.eslintrc` configs
and crashes ("Converting circular structure to JSON") on flat configs.

The migration surfaced 44 errors + 18 warnings; all **44 errors fixed with no suppression**:

- `@typescript-eslint/no-explicit-any` across `lib/mastra/*`, `src/mastra/workflows/*`, and the
  Langdock provider - replaced with `unknown`/precise types, `new RuntimeContext()` for the tool
  call, and guarded `err.message` in `catch` blocks.
- `react-hooks/set-state-in-effect` in `HeroVideo` - refactored to `useSyncExternalStore`.
- `react/no-unescaped-entities`, `prefer-const`, and unused imports/vars.

`npm run lint` exits 0. The 10 remaining `@next/next/no-img-element` **warnings** are the deliberate
`<img>` usages on the pixel-verified Patch 002D landing; they are not suppressed (rule stays active),
and `eslint .` exits 0 with warnings present (matching the agreed script). Converting them to
`next/image` was deliberately deferred to avoid regressing accepted 002D layout and to keep the
image optimizer/`sharp` out of the self-hosted runtime. `typecheck` + `build` stay green and the
offline Mastra POC fallback suite still passes.

## P3.5 Self-hosted deployment config + local validation (commit `5ee31da`)

All serving moves to our own server. (Vercel is **not** decommissioned — it is intentionally left
dormant/parked for possible future reactivation, and is no longer an active deploy target; the
leftover `vercel.json` has been removed.) Committed under `deploy/` (+ `.dockerignore`,
`.github/workflows/deploy.yml`):

| Piece | File |
|---|---|
| Standalone output | `next.config.ts` (`output: "standalone"`) |
| Image (multi-stage, node:22-bookworm-slim, non-root) | `deploy/Dockerfile` |
| Runtime (loopback web, env_file secrets, healthcheck, image pin) | `deploy/compose.yml` |
| Boot/restart | `deploy/getwink.service` (systemd) |
| Edge (www-canonical, apex 301→www, TLS, security headers, APK MIME) | `deploy/nginx/getwink.conf` |
| CI/CD | `.github/workflows/deploy.yml` (typecheck+lint → GHCR image → SSH pull/up → health gate) |
| Runbook + env template | `deploy/README.md`, `deploy/getwink.env.example` |

Local validation ([artifact](/opt/cursor/artifacts/selfhost-build-validation.txt)):

- Standalone `node server.js`: `GET /api/health` 200 JSON `no-store`; `POST` 405; `/`, `/privacy`,
  `/terms`, `/safety`, `/ai`, `/how` all 200.
- Built the Docker image and ran the container (runs as non-root `nextjs`): same health/route results.
- Client bundle (`.next/static`) contains **no** `SUPABASE_ROLE_KEY` / `LANGDOCK_*` references;
  `NEXT_PUBLIC_*` values are baked in (public by design). No `ignoreBuildErrors` /
  `ignoreDuringBuilds` flags.

## P3.6 Preview APK build + cloud real-device smoke test (DONE)

**Build (EAS, profile `preview`, internal distribution):** build
`41b68445-f4dd-40d2-b930-e60f8676b004` finished; signed APK (EAS-managed keystore, cert SHA-256
`252a08…`), package `app.getwink.beta`, versionName `0.3.0`, versionCode 3, minSdk 24 / targetSdk 36,
sha256 `9dfa9bf9728cdbf58a475cff1fadb792e6a0d9e0734b6bb008035c92445df341`. The `preview` EAS
environment supplies `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and
`EXPO_PUBLIC_API_BASE_URL=https://www.getwink.app` (www-canonical, per ruling #3).

**Signing-cert fingerprint (permanent record — must not change across beta releases):**
apksigner Signer #1 certificate SHA-256 `252a08ada276b9e3f9b5ff93bed7ba1bd4853ecf6e81fe7f46bb0766ad4bd9c1`
(SHA-1 `651b64442bfa1aa703206d5debbd3fa83e06d322`). Verify every future beta APK matches this.

**Device-farm deviation:** used **BrowserStack App Automate** rather than the stated primary Firebase
Test Lab — pre-approved fallback; the terminate+relaunch persistence check is more direct in an App
Automate session than a Test Lab robo run, and the session is video-recorded. No re-run required.

**Smoke test (BrowserStack App Automate, Google Pixel 8 / Android 14, video recorded)** using a real
email-confirmed throwaway account (since cleaned up — see P3.8):

| # | Item | Result |
|---|---|---|
| 1 | App launch | PASS - auth screen renders (APK boots with baked Supabase config) |
| 2 | Supabase auth flow | PASS - Sign in → session created → onboarding |
| 3 | Image picker | PASS - "Choose a profile photo" opens the Android photo picker |
| 4 | Secure-store persistence across restart | PASS - terminate + relaunch → still signed in (onboarding, not auth) |
| 5 | API calls to production | Reaches `https://www.getwink.app`, but **production is currently down** |

Artifacts: [summary](/opt/cursor/artifacts/apk-smoke-summary.txt),
[video](/opt/cursor/artifacts/getwink-apk-smoke.mp4), screenshots under
`/opt/cursor/artifacts/apk-smoke/`.

> **Production outage finding:** `https://www.getwink.app` currently returns **HTTP 402
> `DEPLOYMENT_DISABLED`** (Vercel deployment disabled) for both `/api/health` and the app's
> authenticated `/api/ai/chat` call (replicated host-side with a real Supabase bearer token). This is
> the existing Vercel production being down - precisely the driver for this migration. Supabase-backed
> calls (auth) work because Supabase is a separate service. The self-hosted server (validated locally:
> `/api/health` 200 `no-store`) restores the API at cutover.

## P3.7 Open items closed + cutover preparation

**2a - lint warning ceiling pinned (commit pending):** `"lint": "eslint . --max-warnings=10"`.
`npm run lint` → 0 errors, exactly 10 (`no-img-element`) warnings, exit 0; an 11th warning now fails CI.

**2b - server image pruning automated (commit pending):** the deploy workflow prunes after a healthy
deploy, keeping the 3 most recent image IDs (dedupes `latest`/`sha-*` that share an ID; skips the
in-use image). A rollback target is always retained.

**2c - test-account cleanup (DONE):** the throwaway smoke account
(**auth.users id `3f4d1be4-9a30-48aa-b769-32d90ef4e03e`**) has been neutralized: password rotated to a
random unrecorded value and **all sessions globally revoked** — the known credential now returns
`invalid_credentials` (HTTP 400). The AgentMail inbox was deleted. A hard `auth.users` delete/ban
needs the service-role key (not yet on this VM); it is queued as the first cutover action once
`SUPABASE_ROLE_KEY` lands:
`curl -X DELETE "$SUPABASE_URL/auth/v1/admin/users/3f4d1be4-9a30-48aa-b769-32d90ef4e03e" -H "apikey: $SUPABASE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_ROLE_KEY"`.
(The app's `request_account_deletion` workflow could not run for this user because it never created a
`profiles` row, so the deletion-request FK fails — expected for a login-only smoke account.)

**Cutover prep (ready now, no server needed):**
- `deploy/provision.sh` - idempotent, safe to re-run: installs Docker + nginx + certbot, creates
  `/etc/getwink` + `/srv/getwink/download`, installs the systemd unit, serves an HTTP bootstrap so
  certbot `--webroot` can solve ACME, issues the cert, then swaps in the full TLS nginx config
  (both server blocks). Exits cleanly and re-runs if DNS isn't ready yet (DNS-before-certbot).
- `deploy/README.md` - `## 0` pre-flight checklist (ordered, DNS-before-certbot) and `## 6` exact
  post-cutover verification command list (routes, health contract, apex→www 301 on 80+443, APK
  MIME/disposition, client-bundle secret scan, 22-test regression, ignore-flag check, item-5 re-run).
- nginx SSL config inlined (no dependency on certbot's optional `options-ssl-nginx.conf`/dhparams).

## P3.8 Remaining (P0 cutover on credential arrival)

Production is **down** (Vercel `402 DEPLOYMENT_DISABLED`), so cutover is P0 restoration. Vercel is
**left dormant** (parked/disabled for possible future reactivation) — not decommissioned, not an
active deploy target.

**Server:** Strato, Ubuntu 24.04, 12 cores / 48 GB / 720 GB (activation pending). Deploy SSH public
key (ed25519) fingerprint `SHA256:0NyW7T8QTbHrd8SDOTjOMuiNCAAqA0GML+R30Xb5Ivo`.

**Locked cutover order** — on arrival of SSH access, DNS (apex + www), and runtime env values:
`provision.sh` → **hard-delete the test user via admin API** (record confirmation here) → first
deploy strictly via the GH Action → APK to `/srv/getwink/download/beta.apk` → verify
`https://www.getwink.app/download/beta.apk` 200 + MIME + attachment → flip
`NEXT_PUBLIC_ANDROID_APK_URL`, redeploy, CTA live → full verification suite (routes, health contract,
apex→www 301 on 80+443, 22-test security regression, device API smoke item 5 re-run against restored
production, client-bundle secret scan, ignore-flag check) → final walkthrough with runbook + rollback.
