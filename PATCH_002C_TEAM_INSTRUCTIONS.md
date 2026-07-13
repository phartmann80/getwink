# GetWink Patch 002C — Team Instructions

## Base

Apply this correction after the integrated Patch 002B commit:

```text
32beea4abfc5746f34e622b7a9fb372d8299eb9e
```

Create branch:

```text
patch-002c-production-correction
```

## Required work

1. Remove TypeScript and ESLint production build-error ignore flags.
2. Reproduce and fix every build error properly.
3. Ensure `GET /api/health` bypasses AI content-type/auth processing and returns public health JSON.
4. Add health-route tests.
5. Stop linking the landing-page download button to a known 404 APK placeholder.
6. Use a disabled `Android beta coming soon` state when no valid APK URL exists.
7. Run all Patch 002B security tests again.
8. Deploy to Vercel preview without ignore flags.
9. Verify preview routes.
10. Deploy to production only after preview and all tests pass.

## Git

Commit message:

```text
Patch 002C: restore strict builds and production health checks
```

Push the branch and open a PR into the current integration branch/main according to the repository merge state.

## Approval gate

Do not mark the release healthy until:

- normal build succeeds;
- health returns HTTP 200 JSON in production;
- no build bypasses remain;
- broken APK link is removed or replaced with a real reachable APK;
- security tests still pass;
- Vercel production is Ready;
- canonical and legal routes work;
- walkthrough is updated.
