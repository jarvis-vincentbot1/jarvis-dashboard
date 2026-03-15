#!/usr/bin/env bash
# sync-openclaw-credits.sh
# Reads OpenClaw session costs and POSTs them to the Jarvis credits API.
#
# Usage:
#   ./sync-openclaw-credits.sh
#
# Required env vars (set in ~/.zshrc or launchd plist):
#   JARVIS_URL      - e.g. https://jarvis.local or http://localhost:3000
#   CRON_SECRET     - bearer token matching CRON_SECRET in Jarvis .env
#
# Optional env vars:
#   OPENCLAW_MODEL  - model name to report (default: minimax-m2.5:cloud)
#
# To run hourly via cron (crontab -e):
#   0 * * * * /path/to/sync-openclaw-credits.sh >> /tmp/jarvis-credits.log 2>&1

set -euo pipefail

JARVIS_URL="${JARVIS_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"
OPENCLAW_MODEL="${OPENCLAW_MODEL:-minimax-m2.5:cloud}"
TODAY="$(date +%Y-%m-%d)"

# ── Extract cost from `openclaw status` ───────────────────────────────────────
# `openclaw status` outputs JSON with a session_status block containing costs.
# We parse out the total cost in USD for today using jq.

STATUS_JSON="$(openclaw status --json 2>/dev/null || echo '{}')"

# Try to parse total daily cost from status JSON.
# Adjust the jq path if your openclaw version uses a different schema.
TOTAL_COST="$(echo "$STATUS_JSON" | jq -r '
  (.session_status.daily_cost_usd //
   .daily_cost_usd //
   .costs.today_usd //
   0) | tonumber' 2>/dev/null || echo "0")"

# If openclaw status does not expose costs, fall back to sessions list
if [ "$TOTAL_COST" = "0" ] || [ -z "$TOTAL_COST" ]; then
  # Try to sum costs from recent sessions today
  SESSIONS_JSON="$(openclaw sessions list --json 2>/dev/null || echo '[]')"
  TOTAL_COST="$(echo "$SESSIONS_JSON" | jq -r --arg today "$TODAY" '
    [.[] | select(.date == $today or (.created_at // "" | startswith($today))) |
     (.cost_usd // .cost // 0)] | add // 0 | tonumber' 2>/dev/null || echo "0")"
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Syncing OpenClaw credits: model=${OPENCLAW_MODEL} cost=${TOTAL_COST} date=${TODAY}"

# ── POST to Jarvis credits sync endpoint ──────────────────────────────────────
PAYLOAD="{\"totalCost\":${TOTAL_COST},\"model\":\"${OPENCLAW_MODEL}\",\"timeframe\":\"daily\",\"timestamp\":\"${TODAY}\"}"

HTTP_STATUS="$(curl -s -o /tmp/jarvis_credits_resp.json -w "%{http_code}" \
  -X POST "${JARVIS_URL}/api/credits/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -d "$PAYLOAD" \
  --max-time 10)"

RESP="$(cat /tmp/jarvis_credits_resp.json 2>/dev/null || echo '{}')"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] OK — ${RESP}"
else
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR ${HTTP_STATUS} — ${RESP}" >&2
  exit 1
fi
