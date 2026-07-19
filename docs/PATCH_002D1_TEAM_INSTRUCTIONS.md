# GetWink Patch 002D.1 — Complete and Deliver Avatar Integration

## Current branch

Continue on:

```text
patch-002d-landing-page-clone
```

Do not start another feature branch until the current uncommitted work is resolved.

## Critical instruction

The current working directory reportedly has uncommitted modifications and untracked avatar files. Preserve them before switching branches, pulling, resetting, cleaning, or applying another archive.

Do not discard:

- `app/page.tsx`
- `app/styles/globals.css`
- `public/avatar_liam.jpg`
- `public/avatar_maya.jpg`
- `public/avatar_noah.jpg`
- `public/avatar_sofia.jpg`

## Required work

1. Inspect the current diff and verify that it contains only intended Patch 002D landing-page changes.
2. Confirm that `public/getwink_.mp4` is present and tracked.
3. Confirm that the hero still uses the owner's showcase video.
4. Confirm that all four avatar files are present and load successfully.
5. Record the image source/license or owner approval for each avatar.
6. Replace single-letter placeholders with real images consistently.
7. Use stable dimensions/aspect ratios to prevent layout shift.
8. Optimize the avatars without visibly degrading them.
9. Preserve meaningful accessibility behavior.
10. Run strict typecheck, build, security tests, route tests, and visual tests.
11. Commit all intended modified and new files together.
12. Push the branch and deploy a Vercel preview.
13. Send the preview for visual approval before production deployment.

## Video requirements

The hero video must use safe web behavior:

- muted;
- autoPlay;
- loop;
- playsInline;
- preload set deliberately;
- a poster or static fallback;
- no controls unless intentionally designed;
- no sound autoplay;
- reduced-motion behavior;
- mobile-friendly dimensions and cropping.

Verify that the video asset is served from the application and is not dependent on a local-only path.

## Tests

Run:

```text
npm run typecheck
npm run build
```

Run the existing security and route suites.

Verify:

```text
GET /api/health -> HTTP 200 JSON
POST /api/health -> HTTP 405
```

Use `docs/PATCH_002D1_VISUAL_TEST_MATRIX.md` for responsive review.

Required widths:

- 1440
- 1280
- 1024
- 768
- 430
- 390
- 360

Also test:

- reduced motion;
- video autoplay blocked;
- slow connection/fallback image;
- keyboard navigation;
- no horizontal overflow;
- legal routes;
- disabled APK CTA.

## Commit

Use:

```text
Patch 002D.1: complete landing avatars and visual verification
```

Push the branch and open/update the PR.

## Vercel

Create a preview deployment and report:

- preview URL;
- deployment status;
- build result;
- desktop screenshot;
- mobile screenshot;
- video behavior;
- avatar behavior;
- performance notes;
- any remaining visual differences.

Do not deploy to production before visual approval.

## Walkthrough

Update `walkthrough.md` with:

- exact files changed;
- avatar asset names and sources/rights;
- hero video status;
- typecheck/build results;
- security regression result;
- health GET/POST results;
- responsive results;
- reduced-motion result;
- preview URL;
- commit hash;
- push status;
- blockers;
- next task.

## Clean source snapshot

After committing, create:

```text
GetWink-Post-002D1-Source.zip
```

Include the exact committed source, video, avatars, lockfiles, docs, tests, and walkthrough.

Exclude `.git`, dependencies, build output, environment files, local databases, Vercel metadata, logs, secrets, cookies, and test passwords.

Attach the ZIP to the shared GetWink workspace. Do not leave it only in a local Downloads folder.

## Acceptance gate

This work is complete only when:

- no intended files remain uncommitted or untracked;
- avatar rights/source are documented;
- video and all avatars are tracked;
- strict build passes;
- security and health tests pass;
- visual matrix passes;
- preview is available;
- walkthrough is complete;
- source snapshot is attached;
- production has not been changed without approval.
