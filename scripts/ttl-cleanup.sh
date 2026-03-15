#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/ttl-cleanup.sh — Auto-remove expired staging instances
#
# Runs via cron (added by staging-manager.sh create --ttl N).
# Reads the staging registry, finds instances past their TTL, removes them.
#
# Cron entry (added automatically):
#   0 4 * * * /opt/odoo19e-docker/scripts/ttl-cleanup.sh >> /var/log/staging-ttl-cleanup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/lib/common.sh"

echo "=== TTL Cleanup: $(date) ==="

_ensure_registry

# Read all instances with a TTL set
local_instances=$(jq -r '.[] | select(.ttl_days != null) | [.name, .created_at, .ttl_days] | @tsv' "$REGISTRY_FILE" 2>/dev/null || echo "")

if [ -z "$local_instances" ]; then
  echo "No instances with TTL set — nothing to clean up."
  exit 0
fi

removed=0
kept=0

while IFS=$'\t' read -r iname icreated ittl; do
  # Parse created_at timestamp
  created_ts=$(date -d "$icreated" +%s 2>/dev/null || \
               date -j -f "%Y-%m-%dT%H:%M:%SZ" "$icreated" +%s 2>/dev/null || echo "0")
  now_ts=$(date +%s)
  age_days=$(( (now_ts - created_ts) / 86400 ))

  if [ "$age_days" -ge "$ittl" ]; then
    echo "[EXPIRED] stg-${iname} (age: ${age_days}d, ttl: ${ittl}d) — removing..."
    # Call staging-manager.sh remove --force
    if bash "${SCRIPT_DIR}/staging-manager.sh" remove --name "$iname" --force; then
      echo "[REMOVED] stg-${iname}"
      removed=$((removed + 1))
    else
      echo "[ERROR] Failed to remove stg-${iname}"
    fi
  else
    echo "[OK]      stg-${iname} (age: ${age_days}d, ttl: ${ittl}d — ${ttl_remaining}d remaining)"
    kept=$((kept + 1))
  fi
done <<< "$local_instances"

echo "=== Done: ${removed} removed, ${kept} kept ==="
