# Walkthrough - GetWink Patch 002D Landing Page Clone

This document details the configuration, visual styles, and verification for **Patch 002D Landing Page Clone** containing the Dribbble design adaptation and the dynamic hero video integration.

---

## 1. Visual Design Adaptation & Layout Clone
Paul’s original Dribbble design has been cloned and adapted for GetWink:
- **Hero Palette**: Pale mint editorial hero backdrop (`#eefaf4` gradient), bold accent blobs (coral, pink, yellow, mint, and lilac), subtle rounded orbit paths.
- **Organic Wave**: Curved black lower swell (`.black-swell` in `app/styles/globals.css`) transitioning to follow-on content.
- **Typography**: Red Hat Display/Manrope style large two-line centered headline: `Meet the interesting one 😉`.
- **Mockup Components**: Animated floating cards (discovery profile `Maya, 28`, conversation bubble `Sofia`, match-meter interest recommendation bar).
- **Reduced Motion**: CSS `@media (prefers-reduced-motion: reduce)` block disables all ambient blob drifting, card floating, and bubble popping animations smoothly.

---

## 2. Hero Video Integration
Instead of a static profile photo, the main hero spotlight showcases a loop of app interactions:
- **Video Asset**: [getwink_.mp4](file:///c:/Users/hartm/getwink/public/getwink_.mp4) (1280x960 landscape, 2.85 MB) copied into public assets.
- **Implementation**: HTML5 `<video>` tag using class `hero-person` for matching size constraints, responsive width, clipping boundaries, and mixing overlays:
  ```html
  <video
    className="hero-person"
    src="/getwink_.mp4"
    autoPlay
    loop
    muted
    playsInline
    aria-label="A demo video showing GetWink app discovery with swipe-right for Wink and swipe-left for Pass"
  />
  ```
- **Accessibility**: Added descriptive `aria-label` to inform screen readers of the demo contents.

---

## 3. Safe APK CTA Behavior
- Environment URL `NEXT_PUBLIC_ANDROID_APK_URL` is parsed.
- Renders disabled button **"Android beta coming soon"** with `opacity: 0.6; cursor: not-allowed;` because the configured target is the placeholder `https://getwink.app/download/beta.apk`.

---

## 4. Removed Build Bypasses & Strict Compile Results
- Strict build configuration verified (no TypeScript/ESLint ignores active).
- **TypeScript `npm run typecheck`**: **PASSED** (Clean compile).
- **Production Build `npm run build`**: **PASSED** (All dynamic routes and static pages compiled successfully in Vercel build container).

---

## 5. Security & Route Verification Results
- **Automated Security Suite**: **22 PASSED, 0 FAILED** (Zero regressions).
- **Health Route Behavior** (`GET /api/health`):
  - Returns HTTP 200 OK.
  - Headers: `Content-Type: application/json`, `Cache-Control: no-store`.
  - Body: `{"ok":true,"service":"getwink","timestamp":"<ISO timestamp>"}`.

---

## 6. Vercel Preview Deployment
- **Preview URL**: [https://getwink-q15h1hqvg-klaw-gmb-h.vercel.app](https://getwink-q15h1hqvg-klaw-gmb-h.vercel.app)
- **Deployment Status**: ● Ready (Active).
- **Visual Responsiveness Checks**: Verified at 1440px, 1280px, 1024px, 768px, 430px, 390px, and 360px without page overflow or text overlap.

---

## 7. Git & PR Status
- **Branch**: `patch-002d-landing-page-clone`
- **Commit Hash**: `681cffd5ff93db9be3a1059f3d6dbf08b3a0e698` (and walkthrough update commit `08d6c0989f5bc32ad40d4ee8992e94fcc74b6f1e`)
- **Push Status**: Pushed to remote repository.
- **PR Status**: Open pull request into `main`.

---

## 8. Next Steps
- Wait for visual review of the Vercel preview by Paul.
- Create the final source snapshot zip `GetWink-Post-002D-Source.zip` once approved.
