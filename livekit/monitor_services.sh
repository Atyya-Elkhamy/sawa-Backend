#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

services=(caddy livekit ingress redis)

status_ok=true
for s in "${services[@]}"; do
  if ! docker ps --format '{{.Names}}' | grep -q "$s"; then
    echo "[WARN] $s is not running"
    status_ok=false
  else
    echo "[OK] $s running"
  fi

done

# Basic TCP checks
check_port() {
  local host="$1" port="$2" name="$3"
  if (echo >/dev/tcp/$host/$port) >/dev/null 2>&1; then
    echo "[OK] $name port $port reachable on $host"
  else
    echo "[FAIL] $name port $port NOT reachable on $host"
    status_ok=false
  fi
}

check_port 127.0.0.1 443 Caddy
check_port 127.0.0.1 7880 LiveKit-WS
check_port 127.0.0.1 7881 LiveKit-RTC
check_port 127.0.0.1 5349 TURN-TLS
check_port 127.0.0.1 6379 Redis
check_port 127.0.0.1 1935 RTMP
check_port 127.0.0.1 8080 WHIP

$status_ok && exit 0 || exit 1
