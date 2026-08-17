#!/usr/bin/env bash
#
# Pairs this Mac as a Plate Runner Controller against a running backend.
#
# Walks the full controller pairing handshake against the Plate Runner
# API (see docs/PAIRING_SPEC.md / docs/BACKEND_API_SPEC.md):
#   1. POST /api/controllers/pair                         (submit the code)
#   2. GET  /api/controllers/pairing-requests/:id          (poll until the Display approves)
#   3. POST /api/controllers/pairing-requests/:id/finalize (exchange for a controllerToken)
#
# The pairing CODE itself must be generated on the DISPLAY's own screen
# first (Display Mode -> Pairing -> Generate Pairing Code). This script
# does not (and cannot) generate that code itself.
#
# Requires: curl, jq (brew install jq)
#
# Usage:
#   ./pair-controller.sh
#   (or run non-interactively with flags, see --help)

set -euo pipefail

POLL_INTERVAL_SECONDS=2
MAX_POLL_ATTEMPTS=180  # 180 x 2s = 6 minutes — a bit longer than the code's own 5-minute TTL

API_BASE_URL=""
API_KEY=""
CONTROLLER_NAME=""
PAIRING_CODE=""

usage() {
  cat <<'EOF'
Usage: ./pair-controller.sh [-u API_BASE_URL] [-k API_KEY] [-n CONTROLLER_NAME] [-c PAIRING_CODE]

All flags are optional; you will be prompted interactively for anything
not supplied. Flags exist for scripting/non-interactive use.

  -u   API Base URL (default: http://localhost:8787)
  -k   API Key
  -n   Controller name (default: this Mac's hostname)
  -c   Pairing code from the Display's screen
  -h   Show this help
EOF
}

while getopts "u:k:n:c:h" opt; do
  case "$opt" in
    u) API_BASE_URL="$OPTARG" ;;
    k) API_KEY="$OPTARG" ;;
    n) CONTROLLER_NAME="$OPTARG" ;;
    c) PAIRING_CODE="$OPTARG" ;;
    h) usage; exit 0 ;;
    *) usage; exit 1 ;;
  esac
done

fail() {
  echo ""
  echo "ERROR: $1" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || fail "curl is required but not found."
command -v jq   >/dev/null 2>&1 || fail "jq is required but not found. Install it with: brew install jq"

echo "================================================================"
echo "  Plate Runner - Controller Pairing Wizard"
echo "================================================================"
echo ""
echo "This pairs THIS MAC as a Controller for a Plate Runner Display."
echo "You will need:"
echo "  1. The API Base URL and API Key of the backend both this Mac"
echo "     and the Display are talking to."
echo "  2. A pairing code generated FROM THE DISPLAY'S OWN SCREEN"
echo "     (Display Mode -> Pairing -> Generate Pairing Code)."
echo "     Codes expire after 5 minutes."
echo ""
echo "After you enter the code below, this script waits for the"
echo "Display to approve the request on its own screen, then"
echo "finalizes the pairing and prints/saves the Controller Token."
echo "================================================================"
echo ""

if [ -z "$API_BASE_URL" ]; then
  read -r -p "API Base URL [http://localhost:8787]: " API_BASE_URL
  API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
fi

if [ -z "$API_KEY" ]; then
  read -r -p "API Key: " API_KEY
  if [ -z "$API_KEY" ]; then
    fail "API Key is required."
  fi
fi

if [ -z "$CONTROLLER_NAME" ]; then
  DEFAULT_NAME="$(scutil --get ComputerName 2>/dev/null || hostname)"
  read -r -p "Controller name [$DEFAULT_NAME]: " CONTROLLER_NAME
  CONTROLLER_NAME="${CONTROLLER_NAME:-$DEFAULT_NAME}"
fi

if [ -z "$PAIRING_CODE" ]; then
  read -r -p "Pairing code from the Display's screen: " PAIRING_CODE
  if [ -z "$PAIRING_CODE" ]; then
    fail "Pairing code is required."
  fi
fi

# Strip trailing slash
API_BASE_URL="${API_BASE_URL%/}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Performs an API call; prints the JSON body to stdout and exits non-zero on failure.
invoke_api() {
  local method="$1" path="$2" body="${3:-}"
  local response http_code json_body

  if [ -n "$body" ]; then
    response=$(curl -sS -w '\n%{http_code}' -X "$method" \
      -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
      -d "$body" "$API_BASE_URL$path") || fail "$method $path failed - could not reach $API_BASE_URL"
  else
    response=$(curl -sS -w '\n%{http_code}' -X "$method" \
      -H "x-api-key: $API_KEY" \
      "$API_BASE_URL$path") || fail "$method $path failed - could not reach $API_BASE_URL"
  fi

  http_code=$(echo "$response" | tail -n1)
  json_body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 400 ]; then
    local err
    err=$(echo "$json_body" | jq -r '.error // empty' 2>/dev/null || true)
    fail "$method $path failed - ${err:-HTTP $http_code}"
  fi

  echo "$json_body"
}

echo ""
echo "Requesting pairing against $API_BASE_URL ..."

PAIR_BODY=$(jq -n --arg name "$CONTROLLER_NAME" --arg code "$PAIRING_CODE" \
  '{controllerName: $name, code: $code}')
PAIR_RESP=$(invoke_api POST "/api/controllers/pair" "$PAIR_BODY")

OK=$(echo "$PAIR_RESP" | jq -r '.ok')
if [ "$OK" != "true" ]; then
  ERR=$(echo "$PAIR_RESP" | jq -r '.error // "unknown error"')
  fail "Pairing request rejected - $ERR"
fi

REQ_ID=$(echo "$PAIR_RESP" | jq -r '.pairingRequestId')
DISPLAY_ID=$(echo "$PAIR_RESP" | jq -r '.displayId')
DISPLAY_NAME=$(echo "$PAIR_RESP" | jq -r '.displayName')
EXPIRES_AT=$(echo "$PAIR_RESP" | jq -r '.expiresAt')

echo ""
echo "Pairing request created for display '$DISPLAY_NAME' ($DISPLAY_ID)."
echo "Expires at: $EXPIRES_AT"
echo ""
echo "Waiting for the Display to approve this request on its own screen..."

STATUS="approval_pending"
ATTEMPTS=0
while [ "$STATUS" = "approval_pending" ]; do
  if [ "$ATTEMPTS" -ge "$MAX_POLL_ATTEMPTS" ]; then
    fail "Timed out waiting for approval. Ask the Display to generate a fresh code and try again."
  fi
  sleep "$POLL_INTERVAL_SECONDS"
  ATTEMPTS=$((ATTEMPTS + 1))
  POLL_RESP=$(invoke_api GET "/api/controllers/pairing-requests/$REQ_ID")
  STATUS=$(echo "$POLL_RESP" | jq -r '.status')
  echo "  [$ATTEMPTS] status: $STATUS"
done

if [ "$STATUS" != "approved" ]; then
  fail "Pairing did not complete (final status: $STATUS). Ask for a fresh code and try again."
fi

echo ""
echo "Approved! Finalizing..."
FINAL_RESP=$(invoke_api POST "/api/controllers/pairing-requests/$REQ_ID/finalize")

OK=$(echo "$FINAL_RESP" | jq -r '.ok')
if [ "$OK" != "true" ]; then
  ERR=$(echo "$FINAL_RESP" | jq -r '.error // "unknown error"')
  fail "Finalize rejected - $ERR"
fi

FINAL_DISPLAY_ID=$(echo "$FINAL_RESP" | jq -r '.displayId')
CONTROLLER_ID=$(echo "$FINAL_RESP" | jq -r '.controllerId')
CONTROLLER_TOKEN=$(echo "$FINAL_RESP" | jq -r '.controllerToken')

echo ""
echo "=== Pairing complete ==="
echo "Display Name:     $DISPLAY_NAME"
echo "Display ID:       $FINAL_DISPLAY_ID"
echo "Controller ID:    $CONTROLLER_ID"
echo "Controller Token: $CONTROLLER_TOKEN"
echo ""
echo "IMPORTANT: save the Controller Token now - it is shown only this once."
echo "Treat it like a password: whoever holds it can send commands to this display."

RESULT_PATH="$SCRIPT_DIR/pairing-result.json"
jq -n \
  --arg displayId "$FINAL_DISPLAY_ID" \
  --arg displayName "$DISPLAY_NAME" \
  --arg controllerId "$CONTROLLER_ID" \
  --arg controllerToken "$CONTROLLER_TOKEN" \
  --arg apiBaseUrl "$API_BASE_URL" \
  --arg apiKey "$API_KEY" \
  --arg pairedAt "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  '{displayId: $displayId, displayName: $displayName, controllerId: $controllerId, controllerToken: $controllerToken, apiBaseUrl: $apiBaseUrl, apiKey: $apiKey, pairedAt: $pairedAt}' \
  > "$RESULT_PATH"

echo ""
echo "Also saved to: $RESULT_PATH"
echo "(delete that file once you've copied the token somewhere safe - it's a secret, same as an API key)"
