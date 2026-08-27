#!/usr/bin/env bash
# GetWink server provisioning — idempotent and safe to re-run.
#
# Installs Docker + nginx + certbot, creates /etc/getwink and
# /srv/getwink/download, installs the systemd unit, and applies the nginx
# config (bootstrap HTTP first so certbot can solve the ACME challenge, then
# the full TLS config with both server blocks).
#
# PREREQ (see deploy/README.md pre-flight): DNS A/AAAA for BOTH getwink.app and
# www.getwink.app must already point at THIS server before certs can be issued.
# If DNS is not ready yet, the script provisions everything else, leaves an
# HTTP bootstrap site serving the ACME path, and exits 0 so you can re-run it
# once DNS propagates.
#
# Usage (either works). Real run: as the deploy user with CERTBOT_EMAIL set to a
# monitored inbox (ops@getwink.app once that mailbox exists in IONOS):
#   CERTBOT_EMAIL=ops@getwink.app bash deploy/provision.sh        # as the sudo-capable deploy user
#   sudo CERTBOT_EMAIL=ops@getwink.app bash deploy/provision.sh   # as root
set -euo pipefail

log() { echo "[provision] $*"; }

# Elevate if needed: safe to run as root OR as a sudo-capable non-root user
# (e.g. the `deploy` user). Re-exec through sudo, preserving CERTBOT_EMAIL.
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || { echo "Run as root, or install sudo."; exit 1; }
  log "not root; elevating via sudo..."
  exec sudo CERTBOT_EMAIL="${CERTBOT_EMAIL:-}" bash "$(readlink -f "$0")" "$@"
fi

DOMAIN="getwink.app"
WWW="www.getwink.app"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-ops@getwink.app}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The human who invoked sudo (so `docker` group membership lands on the deploy
# user, not root). Falls back to root when run directly as root.
DEPLOY_USER="${SUDO_USER:-$(id -un)}"

# 1) System packages (apt is idempotent).
export DEBIAN_FRONTEND=noninteractive
log "installing packages (docker, nginx, certbot)..."
apt-get update -y
apt-get install -y ca-certificates curl nginx certbot docker.io docker-compose-v2 \
  || apt-get install -y ca-certificates curl nginx certbot docker.io
systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true

# 2) Directories + secrets file (never overwrite an existing env file).
install -d -m 750 /etc/getwink
install -d -m 755 /srv/getwink /srv/getwink/download /var/www/certbot
if [ ! -f /etc/getwink/getwink.env ]; then
  install -m 600 /dev/null /etc/getwink/getwink.env
  log "created empty /etc/getwink/getwink.env — fill it from deploy/getwink.env.example (chmod 600)."
fi

# 3) Compose file + systemd unit. Do NOT start the stack here: the first deploy
#    goes through the GH Action so the pipeline proves itself.
install -m 644 "$SCRIPT_DIR/compose.yml" /srv/getwink/compose.yml
install -m 644 "$SCRIPT_DIR/getwink.service" /etc/systemd/system/getwink.service
systemctl daemon-reload
systemctl enable getwink.service

# 4) Bootstrap HTTP site so certbot --webroot can solve the ACME challenge
#    (the full TLS config cannot pass `nginx -t` until certs exist).
cat >/etc/nginx/sites-available/getwink-bootstrap.conf <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { default_type text/plain; return 200 'getwink provisioning'; }
}
EOF
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/getwink.conf
ln -sf /etc/nginx/sites-available/getwink-bootstrap.conf /etc/nginx/sites-enabled/getwink-bootstrap.conf
nginx -t && systemctl reload nginx

# 5) Obtain the Let's Encrypt cert if missing (single lineage covering both names).
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  log "requesting certificate for $DOMAIN + $WWW (requires DNS pointing here)..."
  if ! certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" -d "$WWW" \
       --non-interactive --agree-tos -m "$CERTBOT_EMAIL"; then
    log "certbot failed — DNS for $DOMAIN and $WWW may not point here yet."
    log "Bootstrap HTTP site remains active; re-run this script after DNS propagates."
    exit 0
  fi
fi

# 6) Switch to the full TLS config (both server blocks) and drop the bootstrap.
install -m 644 "$SCRIPT_DIR/nginx/getwink.conf" /etc/nginx/sites-available/getwink.conf
ln -sf /etc/nginx/sites-available/getwink.conf /etc/nginx/sites-enabled/getwink.conf
rm -f /etc/nginx/sites-enabled/getwink-bootstrap.conf
nginx -t && systemctl reload nginx

log "nginx is serving TLS for $DOMAIN + $WWW."
log "DONE. Next: (1) run the GH Action to deploy the app image; (2) copy the signed APK to"
log "      /srv/getwink/download/beta.apk; (3) verify per deploy/README.md."
