# GetWink Patch 002D.1 — Avatar Integration Completion

## Status found during review

The development report describes the following uncommitted changes:

- modified `app/page.tsx`
- modified `app/styles/globals.css`
- untracked `public/avatar_liam.jpg`
- untracked `public/avatar_maya.jpg`
- untracked `public/avatar_noah.jpg`
- untracked `public/avatar_sofia.jpg`

These changes are not a completed patch until they are committed, pushed, built, visually tested, and included in a clean source snapshot.

## Important preservation rule

The branch reportedly uses `public/getwink_.mp4` as the hero showcase. Do not replace it with the earlier static hero implementation when finishing the avatar work.

The final branch should retain:

- the owner's showcase video;
- mobile overlap corrections;
- four-person mixed-gender discovery stack;
- disabled APK placeholder behavior;
- strict health route behavior;
- all Patch 002B security controls.

## Avatar requirements

The four avatar files must be deliberately sourced and approved for production use. Record the source/license or owner authorization in the walkthrough.

Each card should use a real image with:

- stable aspect ratio;
- `object-fit: cover`;
- intentional focal position;
- meaningful alt text when informative;
- empty alt text when purely decorative;
- explicit dimensions or reserved aspect ratio to avoid layout shift;
- optimized file size and modern delivery through Next Image where appropriate.

Do not commit test photos without confirmed rights or consent.
