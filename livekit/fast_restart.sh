#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

compose() {
  if command -v docker &>/dev/null; then
    if docker compose version &>/dev/null; then
      docker compose "$@"
      return
    fi
  fi
  if command -v docker-compose &>/dev/null; then
    docker-compose "$@"
    return
  fi
  echo "Docker Compose is not installed. Install Docker Compose v2 (docker compose) or v1 (docker-compose)." >&2
  exit 1
}

# Fast path: restart only changed containers
compose up -d --remove-orphans --no-deps caddy livekit ingress redis

echo "Fast restart done."
