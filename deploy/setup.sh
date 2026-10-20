#!/usr/bin/env bash
# One-time server setup (Amazon Linux 2023 or Ubuntu, x86_64 or arm64), as root:
#   curl -fsSL https://raw.githubusercontent.com/wookja-0/gno-wrapped/main/deploy/setup.sh | sudo bash
# Installs Docker with the compose plugin, adds 1 GB of swap, clones the repo to /opt/gno-wrapped,
# creates data/ for the batch (it runs as uid 65532) and a .env to fill in, and, if BACKUP_S3_URI
# is set in .env, a daily backup of data/share-ids.json. Safe to run again.
set -euo pipefail

DIR=/opt/gno-wrapped
REPO=https://github.com/wookja-0/gno-wrapped.git

# --- docker, git
if ! command -v docker >/dev/null; then
  if command -v dnf >/dev/null; then
    dnf install -y docker git
  else
    apt-get update && apt-get install -y docker.io git curl
  fi
  systemctl enable --now docker
fi
if ! docker compose version >/dev/null 2>&1; then
  arch=$(uname -m) # x86_64 | aarch64: the names compose releases use
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${arch}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# --- 1 GB swap: headroom for a memory spike on a 2 GB instance
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

# --- repo, data, settings
[ -d "$DIR/.git" ] || git clone -q "$REPO" "$DIR"
install -d -o 65532 -g 65532 "$DIR/data" "$DIR/data/out" # out/ too: the api mounts it, and Docker would create it as root
if [ ! -f "$DIR/.env" ]; then
  cat >"$DIR/.env" <<'ENV'
# Public hostname (its A record points here); Caddy gets its certificate from Let's Encrypt
DOMAIN=
# Optional: s3://bucket/prefix for a daily copy of data/share-ids.json (needs s3:PutObject there)
BACKUP_S3_URI=
# Optional, as in .env.example: INDEXER_URL, INDEXER_WS_URL, CHUNK_BLOCKS, REQUEST_DELAY
ENV
  echo "created $DIR/.env: set DOMAIN"
fi

# --- daily backup of share-ids.json (losing it breaks every share link)
if grep -q '^BACKUP_S3_URI=s3://' "$DIR/.env"; then
  command -v aws >/dev/null || snap install aws-cli --classic # Amazon Linux has it; Ubuntu doesn't
  aws=$(command -v aws)
  cat >/etc/systemd/system/gno-wrapped-backup.service <<UNIT
[Unit]
Description=Back up gno-wrapped share IDs to S3
[Service]
Type=oneshot
ExecStart=/bin/sh -c '. $DIR/.env && $aws s3 cp $DIR/data/share-ids.json "\$BACKUP_S3_URI/share-ids-\$(date -u +%%F).json" --only-show-errors'
UNIT
  cat >/etc/systemd/system/gno-wrapped-backup.timer <<'UNIT'
[Unit]
Description=Daily gno-wrapped share ID backup
[Timer]
OnCalendar=daily
Persistent=true
[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload && systemctl enable --now gno-wrapped-backup.timer
  echo "daily backup to S3 enabled"
fi

echo "setup done. Next: fill in $DIR/.env, then deploy from GitHub Actions (Release → Run workflow)."
