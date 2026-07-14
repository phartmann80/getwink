# GetWink Patch 002D — Team Instructions

## Base branch

Apply after the current production-correction branch is settled. Create:

```text
patch-002d-landing-page-clone
```

## What is included

- Replacement `app/page.tsx`
- Replacement `app/components/Header.tsx`
- Replacement `app/components/Footer.tsx`
- Replacement `app/styles/globals.css`
- `public/getwink-hero-person.png`
- Existing GetWink logo under `public/logo.png`
- Landing-page documentation

## Apply

1. Unzip this package.
2. Copy the inner folder contents into the repo root.
3. Do not overwrite environment files.
4. Keep the existing legal, health, auth, Mastra, Supabase, and API files unless this patch explicitly contains them.
5. Run strict typecheck and production build.
6. Run the complete security regression suite.
7. Visually review desktop, tablet, and mobile.
8. Verify reduced-motion mode.
9. Verify the APK CTA remains disabled while the placeholder URL is configured.
10. Create a Vercel preview and review it before production merge.

## Visual review checklist

- Header remains readable over the hero.
- Hero headline does not overlap profile cards.
- Portrait remains centered at 1280px, 1024px, 768px, 390px, and 360px widths.
- Floating cards never create horizontal scrolling.
- Legal links work.
- Keyboard focus is visible.
- Motion is disabled when reduced-motion is requested.
- Hero image is compressed/optimized if Vercel performance requires it.

## Production routes

Verify:

- `/`
- `/privacy`
- `/terms`
- `/safety`
- `/api/health`

Do not change the protected AI route behavior.

## Commit

```text
Patch 002D: clone owner landing design for GetWink
```

Push the branch and open a PR. Include screenshots and the Vercel preview URL in `walkthrough.md`.
