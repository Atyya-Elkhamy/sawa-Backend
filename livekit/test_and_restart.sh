#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

./monitor_services.sh || {
  echo "One or more services unhealthy. Restarting..."
  ./restart_services.sh
  sleep 3
  ./monitor_services.sh || exit 1
}

echo "All good."
