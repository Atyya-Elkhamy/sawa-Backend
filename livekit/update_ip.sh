#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Replace rtmp/whip/realtime domains or IPs in config files quickly
old=${1:-realtime.rootmatrix.cloud	}
new=${2:-realtime.example.com}

sed -i "s/${old//\//\/}/${new//\//\/}/g" livekit.yaml ingress.yaml caddy.yaml

echo "Replaced occurrences of '$old' with '$new' in caddy.yaml, livekit.yaml, ingress.yaml"
