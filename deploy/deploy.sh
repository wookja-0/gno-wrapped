#!/usr/bin/env bash
# Start one commit's images: deploy/deploy.sh <git-sha>
# Run on the server from the repo root, with that commit checked out (release.yml does both over
# SSM). Rolls back to the previous deploy when the new one doesn't come up healthy.
set -euo pipefail
cd "$(dirname "$0")/.."

sha=${1:?usage: deploy/deploy.sh <git-sha>}
prev=$(cat .deployed 2>/dev/null || true)
compose() { IMAGE_TAG=$1 docker compose --env-file .env -f deploy/compose.prod.yml "${@:2}"; }

# web answers and reaches the api (checked from inside the web container: nothing else is published)
healthy() {
  for _ in $(seq 1 30); do
    if compose "$1" exec -T web wget -q -O /dev/null http://127.0.0.1:3000/ &&
      compose "$1" exec -T web wget -q -O /dev/null http://api:8080/healthz; then
      return 0
    fi
    sleep 2
  done
  return 1
}

echo "deploying ${sha} (previous: ${prev:-none})"
compose "$sha" pull -q --ignore-pull-failures # images loaded by hand (docker load) are used as they are
compose "$sha" up -d --remove-orphans

if ! healthy "$sha"; then
  echo "deploy ${sha} is not healthy" >&2
  compose "$sha" logs --tail 50 web api >&2 || true
  if [ -n "$prev" ]; then
    echo "rolling back to ${prev}" >&2
    compose "$prev" up -d --remove-orphans
  fi
  exit 1
fi

echo "$sha" >.deployed
# unused images of this repo older than a week (the host is shared: leave other images alone)
docker image prune -af --filter "until=168h" \
  --filter "label=org.opencontainers.image.source=https://github.com/wookja-0/gno-wrapped" >/dev/null
echo "deployed ${sha}"
