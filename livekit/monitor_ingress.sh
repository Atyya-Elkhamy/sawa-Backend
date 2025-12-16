#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

name=ingress
if ! docker ps --format '{{.Names}}' | grep -q "$name"; then
  echo "[WARN] $name not running"
  exit 1
fi

echo "Recent logs for $name (last 100 lines):"
docker logs --tail 100 "$name" || true

# Quick RTMP/WHIP port tests
for p in 1935 8080; do
  if (echo >/dev/tcp/127.0.0.1/$p) >/dev/null 2>&1; then
    echo "[OK] port $p reachable"
  else
    echo "[FAIL] port $p not reachable"
  fi
 done
