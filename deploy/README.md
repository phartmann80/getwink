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

## 1. One-time server provisioning

Prereqs: DNS `A`/`AAAA` for `getwink.app` AND `www.getwink.app` point at the
server; Docker Engine + compose plugin, nginx, and certbot installed.

```bash
sudo mkdir -p /srv/getwink/download /etc/getwink /var/www/certbot
sudo install -m 600 /dev/null /etc/getwink/getwink.env   # then fill from getwink.env.example

# TLS (single cert lineage 'getwink.app' covering both names):
sudo certbot certonly --webroot -w /var/www/certbot \
  -d getwink.app -d www.getwink.app
# certbot installs a systemd renew timer automatically; verify:
systemctl list-timers | grep certbot

# nginx site:
sudo cp deploy/nginx/getwink.conf /etc/nginx/sites-available/getwink.conf
sudo ln -sf /etc/nginx/sites-available/getwink.conf /etc/nginx/sites-enabled/getwink.conf
sudo nginx -t && sudo systemctl reload nginx

# compose + systemd:
sudo cp deploy/compose.yml /srv/getwink/compose.yml
sudo cp deploy/getwink.service /etc/systemd/system/getwink.service
sudo systemctl daemon-reload && sudo systemctl enable --now getwink.service
```

The deploy user needs Docker access and write access to `/srv/getwink`.

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

Prune conservatively (retain the last few tags):
`docker image ls ...` then remove only images older than the 3 most recent.

## 6. Post-cutover verification

```bash
for p in / /privacy /terms /safety; do
  curl -s -o /dev/null -w "www$p -> %{http_code}\n" https://www.getwink.app$p
done
curl -sI https://www.getwink.app/api/health          # 200 JSON, Cache-Control: no-store
curl -sI http://getwink.app/  | grep -i location      # 301 -> https://www.getwink.app/
curl -sI https://getwink.app/ | grep -i location      # 301 -> https://www.getwink.app/
```

Also confirm no server secrets appear in client bundles
(`.next/static`/served JS should contain no `SUPABASE_ROLE_KEY`/`LANGDOCK_*`/`MODEL`),
and that no build-error-ignore flags exist (`next.config.ts` has no
`eslint.ignoreDuringBuilds` / `typescript.ignoreBuildErrors`).
