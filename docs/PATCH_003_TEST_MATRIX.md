# Patch 003 acceptance matrix

| Area | Verification | Expected |
|---|---|---|
| Config | Public Expo config inspection | No server secrets |
| Static | Mobile TypeScript check | No errors |
| Auth | Sign up/sign in/relaunch | Session restores securely |
| Onboarding | Missing fields | Trial does not start |
| Onboarding | Required fields plus photo | Profile completes; trial starts once |
| Discovery | Pass and mutual Wink | Actions persist; match is idempotent |
| Chat | Send/reload | Message persists only for participants |
| Safety | Report/block | RPC succeeds and blocked match closes |
| AI | Request opener | Authenticated suggestion; never auto-sent |
| Account | Request deletion | Existing deletion workflow starts |
| Build | EAS preview Android build | Signed installable APK |
| Device | Two physical Android devices | Core flows pass |
