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

**Fallback (pending approval):** EAS internal-distribution APK installed on a physical Android device,
and/or Expo Go on a physical device. Metro bundling for Android is verified working here.

## P3.4 Remaining Patch 003 work (gated on approval / secrets)

Not started - awaiting Paul's go-ahead and the required secrets/access:

- Build preview APK: `eas build --platform android --profile preview` (needs `EXPO_TOKEN`).
- Smoke test the APK against Supabase + `https://getwink.app`.
- Host the signed APK at `https://getwink.app/download/beta.apk` (HTTP 200,
  `Content-Type: application/vnd.android.package-archive`).
- Enable the landing CTA by setting `NEXT_PUBLIC_ANDROID_APK_URL` only after that URL returns 200.
- Migrate deployment off Vercel to the self-hosted server (Next.js `output: "standalone"`,
  Docker + nginx + certbot, restart unit, deploy pipeline); move all env vars to the server.
- Re-instate a working lint gate: Next 16 removed `next lint`; the `lint` script must be migrated to
  the ESLint CLI with a flat config so `npm run lint` passes again (strict typecheck + lint).
- Production verification: `/`, `/privacy`, `/terms`, `/safety`, `/api/health` (200 JSON, no-store),
  canonical www redirect, no secrets in client bundles.
