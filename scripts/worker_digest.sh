#!/usr/bin/env bash
# Append a DIGEST section (first 25 lines of the worker's reply) to a swarmforge
# worker log that lacks one. The swarmforge extension writes digests itself for
# new runs; this is the fallback/convention script for older or external logs.
#
# Usage: scripts/worker_digest.sh [path-to-worker-log]
#        (defaults to newest .swarmforge-logs/worker-*.log)
set -euo pipefail

log="${1:-$(ls -t .swarmforge-logs/worker-*.log 2>/dev/null | head -1)}"
[ -n "$log" ] && [ -f "$log" ] || { echo "no worker log found" >&2; exit 1; }

if grep -q "=== DIGEST" "$log"; then
  echo "digest already present in $log"
  exit 0
fi

# Worker reply = everything after the [task end] marker (or the whole file for
# logs written before that marker existed), minus the trailing exit/digest lines.
body=$(awk '/^\[task end\]$/{f=1;next} /^\[worker exit/{f=0} f' "$log")
digest=$(printf '%s\n' "$body" | head -25)
extra=$(printf '%s\n' "$body" | wc -l)
[ "$extra" -gt 25 ] && digest="$digest
... ($((extra - 25)) more lines, full output above in this log)"

printf '\n=== DIGEST (first 25 lines of worker reply) ===\n%s\n=== END DIGEST ===\n' "$digest" >> "$log"
echo "digest appended to $log"
