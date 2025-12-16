#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Quick baseline checks
/usr/bin/time -f "Elapsed: %E, CPU: %P, MaxRSS: %M KB" docker ps >/dev/null

echo "Container CPU/mem snapshot:"
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'

# Optional: check UDP range availability
start=50000
end=60000
closed=0
for p in $(seq $start $((start+20))); do
  if ss -lun | awk '{print $5}' | grep -q ":$p$"; then
    :
  else
    closed=$((closed+1))
  fi
 done

echo "UDP ports $start-$((start+20)) free: $closed/21"
