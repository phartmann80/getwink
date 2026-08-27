# GetWink self-hosted deployment runbook

Production is served entirely from our own server. **Vercel is decommissioned
for this project** — no Vercel deploys or previews.

- Canonical host: `https://www.getwink.app` (apex `getwink.app` 301s to www).
- Runtime: Next.js 16 `output: "standalone"` in Docker (`node:22-bookworm-slim`,
  non-root) on `127.0.0.1:3000`, behind host-managed **nginx** with TLS from
  **Let's Encrypt/certbot**. Restarts via the `getwink.service` systemd unit.
- Images: `ghcr.io/phartmann80/getwink`, tagged `sha-<gitsha>` + `latest`.

All secrets are provided out-of-band and never committed. Placeholders below are
shown as `<configured>`.

## 0. Cutover pre-flight checklist (do in this order)

Production is currently **down** (Vercel `402 DEPLOYMENT_DISABLED`), so this is a P0
restoration. Order matters — especially **DNS before certbot**:

1. [ ] Server reachable over SSH; deploy user has sudo.
2. [ ] **DNS** `A`/`AAAA` for **both** `getwink.app` AND `www.getwink.app` point at the server.
       Verify: `dig +short getwink.app` and `dig +short www.getwink.app` return the server IP.
       *(certbot's HTTP-01 challenge fails until this is true.)*
3. [ ] GitHub secrets set: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
       `NEXT_PUBLIC_SUPABASE_ANON_KEY`; variable `NEXT_PUBLIC_ANDROID_APK_URL` (empty for now).
4. [ ] Run the provision script (idempotent) — installs Docker/nginx/certbot, creates dirs,
       installs the systemd unit, issues the cert, applies the nginx config:
       ```bash
       sudo CERTBOT_EMAIL=<ops-email> bash deploy/provision.sh
       ```
       If DNS is not ready it provisions everything else and exits; just re-run after propagation.
5. [ ] Fill `/etc/getwink/getwink.env` from `getwink.env.example` (chmod 600; never commit).
6. [ ] First deploy **only via the GitHub Action** (merge to `main` / `workflow_dispatch`) so the
       pipeline proves itself. Do not hand-run `docker compose up` for the first release.
7. [ ] Upload the signed APK (§4), flip the CTA (§4), then run the full verification suite (§6).

`certbot` installs its own systemd renew timer; verify with `systemctl list-timers | grep certbot`.

## 2. CI/CD secrets (GitHub → Settings → Secrets and variables → Actions)

Secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (deploy private key),
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Variables: `NEXT_PUBLIC_ANDROID_APK_URL` (empty until the APK is live, then
`https://www.getwink.app/download/beta.apk`).

GHCR push uses the built-in `GITHUB_TOKEN` (`packages: write`).

## 3. Deploy (automatic on merge to main)

`.github/workflows/deploy.yml` runs: **typecheck + lint (required)** → build &
push image (`sha-<gitsha>` + `latest`) → scp `compose.yml` → `docker compose
pull && up -d` pinned to the new SHA → **health gate** (`/api/health` must
return 200 `{"ok":true}` or the deploy fails).

## 4. Beta APK hosting

```bash
# Upload the signed EAS preview APK to the server, then:
sudo install -m 644 beta.apk /srv/getwink/download/beta.apk
curl -sSI https://www.getwink.app/download/beta.apk   # expect 200 + application/vnd.android.package-archive
```

Only after the URL returns 200 with the real APK: set the
`NEXT_PUBLIC_ANDROID_APK_URL` variable to the www URL and re-run the deploy so
the landing CTA goes live.

## 5. Rollback (one image tag away)

```bash
# List recent images (keep at least the last 3 for instant rollback):
docker image ls ghcr.io/phartmann80/getwink

# Roll back to a previous SHA:
sudo sed -i 's#^GETWINK_IMAGE=.*#GETWINK_IMAGE=ghcr.io/phartmann80/getwink:sha-<previoussha>#' /etc/getwink/deploy.env
GETWINK_IMAGE=ghcr.io/phartmann80/getwink:sha-<previoussha> \
  docker compose -f /srv/getwink/compose.yml up -d
curl -s https://www.getwink.app/api/health
```

Old images are pruned automatically by the deploy workflow (keeps the 3 most recent image IDs),
so a rollback target is always on the box.

## 6. Post-cutover verification (run top to bottom; minutes, not hours)

```bash
# 6.1 Routes (expect 200 each)
for p in / /privacy /terms /safety; do
  curl -s -o /dev/null -w "www$p -> %{http_code}\n" https://www.getwink.app$p
done

# 6.2 Health contract (expect 200, application/json, Cache-Control: no-store; POST 405 + Allow: GET)
curl -sS -D - -o /dev/null https://www.getwink.app/api/health | grep -iE '^HTTP/|content-type|cache-control'
curl -sS -o /dev/null -w "POST /api/health -> %{http_code}\n" -X POST https://www.getwink.app/api/health

# 6.3 Canonical apex -> www 301 on BOTH 80 and 443
curl -sI http://getwink.app/       | grep -iE '^HTTP/|^location'   # 301 -> https://www.getwink.app/
curl -sI https://getwink.app/      | grep -iE '^HTTP/|^location'   # 301 -> https://www.getwink.app/

# 6.4 Beta APK: 200 + correct MIME + attachment disposition
curl -sI https://www.getwink.app/download/beta.apk \
  | grep -iE '^HTTP/|content-type|content-disposition'
#   expect: 200 ; application/vnd.android.package-archive ; attachment; filename="getwink-beta.apk"

# 6.5 No server secrets in the served client bundle
mkdir -p /tmp/verify && cd /tmp/verify
for u in $(curl -s https://www.getwink.app/ | grep -oE '/_next/static/[^"]+\.js' | sort -u); do
  curl -s "https://www.getwink.app$u"
done | grep -E 'SUPABASE_ROLE_KEY|LANGDOCK_API_CODE|LANGDOCK_ENDPOINT_URL' \
  && echo '!!! SECRET LEAK' || echo 'client bundle clean: no server secrets'

# 6.6 22-test security regression (server-side; needs the real Supabase env on the box)
#   docker exec getwink-web sh -c 'node ...'  OR run in CI with the preview env:
npx tsx lib/mastra/run-mastra-auth-tests.ts   # expect "22 PASSED, 0 FAILED"

# 6.7 next.config has no build-error-ignore flags
grep -nE 'ignoreBuildErrors|ignoreDuringBuilds' next.config.ts && echo '!!! flag present' || echo 'no ignore flags'
```

6.8 Re-run the device API smoke item (§ smoke-test, item 5) against restored production: with a
fresh email-confirmed throwaway account, the app's Wingmate call to
`https://www.getwink.app/api/ai/chat` must return 200 (not 402). Clean up that account afterward
(rotate password + global logout now; hard-delete once `SUPABASE_ROLE_KEY` is on the box:
`curl -sS -X DELETE "$SUPABASE_URL/auth/v1/admin/users/<id>" -H "apikey: $SUPABASE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_ROLE_KEY"`).
