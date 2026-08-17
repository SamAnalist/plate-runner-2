#!/usr/bin/env bash
#
# Sends a random plate to a paired Plate Runner Display as a Controller
# (POST /api/remote/displays/:displayId/simulate), optionally in
# "wait_for_signal" gate mode — in which case this script blocks until you
# press Enter, then sends the open-gate command
# (POST /api/remote/displays/:displayId/open-gate).
#
# There is no API endpoint that reports live simulation phase (the backend
# is a fire-and-forget command queue, not a state stream — see
# docs/COMMANDS.md). So "wait for the car to actually be stopped at the
# gate" is a human judgment call: watch the Display/Camera Mode screen and
# press Enter only once the plate is visibly stopped and readable.
#
# Requires: curl, jq (brew install jq)
#
# Usage:
#   ./send-random-plate.sh
#   ./send-random-plate.sh -u API_BASE_URL -t CONTROLLER_TOKEN -d DISPLAY_ID -w yes
#
# By default, API base URL / controller token / display ID are read from
# ./pairing-result.json (written by pair-controller.sh) if present.

set -euo pipefail

API_BASE_URL=""
API_KEY=""
CONTROLLER_TOKEN=""
DISPLAY_ID=""
WAIT_FOR_SIGNAL=""   # "yes" | "no" | "" (prompt)
PLATE_LENGTH=""   # empty = pick randomly between 6-8
DIRECTION="incoming"
DETECTOR_PLACEMENT="center_front"
VEHICLE_COLOR=""   # empty = pick randomly among blue/red/gray

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAIRING_RESULT="$SCRIPT_DIR/pairing-result.json"

usage() {
  cat <<'EOF'
Usage: ./send-random-plate.sh [-u API_BASE_URL] [-k API_KEY] [-t CONTROLLER_TOKEN] [-d DISPLAY_ID]
                               [-w yes|no] [-l PLATE_LENGTH] [-D incoming|away]
                               [-p DETECTOR_PLACEMENT] [-c VEHICLE_COLOR]

If -u/-k/-t/-d are omitted, they're read from ./pairing-result.json
(written by pair-controller.sh). All other flags are optional; you'll be
prompted for anything not supplied.

Every /api/remote/... call needs BOTH the API key (same one used to pair)
and the controller token — a missing/wrong API key and a missing/wrong
controller token both come back from the server as the same generic
"unauthorized" error, so double check both if you hit it.

  -u   API Base URL
  -k   API Key (same one used for pairing)
  -t   Controller token (from pairing)
  -d   Display ID (from pairing)
  -w   Skip the wait_for_signal prompt: "yes" or "no"
  -l   Random plate length, 1-12 (default: random between 6-8)
  -D   Direction: incoming | away (default: incoming)
  -p   Detector placement, must match direction (default: center_front)
  -c   Vehicle color: blue | red | gray (default: random)
  -h   Show this help
EOF
}

while getopts "u:k:t:d:w:l:D:p:c:h" opt; do
  case "$opt" in
    u) API_BASE_URL="$OPTARG" ;;
    k) API_KEY="$OPTARG" ;;
    t) CONTROLLER_TOKEN="$OPTARG" ;;
    d) DISPLAY_ID="$OPTARG" ;;
    w) WAIT_FOR_SIGNAL="$OPTARG" ;;
    l) PLATE_LENGTH="$OPTARG" ;;
    D) DIRECTION="$OPTARG" ;;
    p) DETECTOR_PLACEMENT="$OPTARG" ;;
    c) VEHICLE_COLOR="$OPTARG" ;;
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

# ── Load defaults from pairing-result.json when flags weren't given ────────
if [ -f "$PAIRING_RESULT" ]; then
  [ -z "$API_BASE_URL" ] && API_BASE_URL=$(jq -r '.apiBaseUrl // empty' "$PAIRING_RESULT")
  [ -z "$API_KEY" ] && API_KEY=$(jq -r '.apiKey // empty' "$PAIRING_RESULT")
  [ -z "$CONTROLLER_TOKEN" ] && CONTROLLER_TOKEN=$(jq -r '.controllerToken // empty' "$PAIRING_RESULT")
  [ -z "$DISPLAY_ID" ] && DISPLAY_ID=$(jq -r '.displayId // empty' "$PAIRING_RESULT")
fi

echo "================================================================"
echo "  Plate Runner - Send Random Plate"
echo "================================================================"
echo ""

if [ -z "$API_BASE_URL" ]; then
  read -r -p "API Base URL: " API_BASE_URL
  [ -z "$API_BASE_URL" ] && fail "API Base URL is required."
fi
API_BASE_URL="${API_BASE_URL%/}"

if [ -z "$API_KEY" ]; then
  read -r -p "API Key: " API_KEY
  [ -z "$API_KEY" ] && fail "API Key is required — every /api/remote/... call needs it in addition to the controller token."
fi

if [ -z "$CONTROLLER_TOKEN" ]; then
  read -r -p "Controller Token: " CONTROLLER_TOKEN
  [ -z "$CONTROLLER_TOKEN" ] && fail "Controller Token is required."
fi

if [ -z "$DISPLAY_ID" ]; then
  read -r -p "Display ID: " DISPLAY_ID
  [ -z "$DISPLAY_ID" ] && fail "Display ID is required."
fi

if [[ ! "$DIRECTION" =~ ^(incoming|away)$ ]]; then
  fail "Direction must be 'incoming' or 'away'."
fi

case "$DIRECTION" in
  incoming)
    [[ "$DETECTOR_PLACEMENT" =~ ^(driver_front|center_front|passenger_front)$ ]] \
      || fail "detectorPlacement '$DETECTOR_PLACEMENT' is not valid for direction 'incoming' (use driver_front|center_front|passenger_front)."
    ;;
  away)
    [[ "$DETECTOR_PLACEMENT" =~ ^(driver_back|center_back|passenger_back)$ ]] \
      || fail "detectorPlacement '$DETECTOR_PLACEMENT' is not valid for direction 'away' (use driver_back|center_back|passenger_back)."
    ;;
esac

if [ -z "$VEHICLE_COLOR" ]; then
  # Mirrors VEHICLE_COLORS in packages/shared/src/types/simulation.ts.
  VEHICLE_COLORS=(blue red gray)
  VEHICLE_COLOR="${VEHICLE_COLORS[$((RANDOM % ${#VEHICLE_COLORS[@]}))]}"
fi
[[ "$VEHICLE_COLOR" =~ ^(blue|red|gray)$ ]] || fail "Vehicle color must be blue, red, or gray."

if [ -z "$PLATE_LENGTH" ]; then
  PLATE_LENGTH=$((6 + RANDOM % 3))   # 6, 7, or 8
fi
if ! [[ "$PLATE_LENGTH" =~ ^[0-9]+$ ]] || [ "$PLATE_LENGTH" -lt 1 ] || [ "$PLATE_LENGTH" -gt 12 ]; then
  fail "Plate length must be an integer between 1 and 12."
fi

# ── Generate a random plate: A-Z0-9 only, uppercase, no separators ─────────
# Mirrors packages/shared/src/validators/plate.ts (PLATE_REGEX = /^[A-Z0-9]+$/, MAX_LENGTH = 12).
generate_plate() {
  local chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  local plate=""
  local i n
  for ((i = 0; i < PLATE_LENGTH; i++)); do
    n=$((RANDOM % ${#chars}))
    plate="$plate${chars:$n:1}"
  done
  echo "$plate"
}

PLATE=$(generate_plate)
echo "Generated plate: $PLATE"
echo ""

# ── Ask about wait_for_signal ───────────────────────────────────────────────
if [ -z "$WAIT_FOR_SIGNAL" ]; then
  read -r -p "Wait for signal at the gate before opening it? [y/N]: " ANSWER
  case "$ANSWER" in
    [yY]|[yY][eE][sS]) WAIT_FOR_SIGNAL="yes" ;;
    *) WAIT_FOR_SIGNAL="no" ;;
  esac
fi

if [ "$WAIT_FOR_SIGNAL" = "yes" ]; then
  GATE_MODE="wait_for_signal"
else
  GATE_MODE="auto_open"
fi

# ── Build request body (mirrors SimulationConfig/GateConfig/PlateQueueConfig
#    shapes in packages/shared/src/types) ──────────────────────────────────
BODY=$(jq -n \
  --arg plate "$PLATE" \
  --arg direction "$DIRECTION" \
  --arg detectorPlacement "$DETECTOR_PLACEMENT" \
  --arg vehicleColor "$VEHICLE_COLOR" \
  --arg gateMode "$GATE_MODE" \
  '{
    plate: $plate,
    direction: $direction,
    detectorPlacement: $detectorPlacement,
    vehicleColor: $vehicleColor,
    gateConfig: {
      gateMode: $gateMode,
      gateInitialState: "closed",
      stopBeforeOpenMs: 3000,
      delayAfterOpenMs: 1400
    },
    queueConfig: {
      mode: "run_all",
      gapBetweenVehiclesMs: 1500,
      loop: false
    },
    speedPreset: "fast"
  }')

invoke_api() {
  local method="$1" path="$2" body="${3:-}"
  local response http_code json_body

  if [ -n "$body" ]; then
    response=$(curl -sS -w '\n%{http_code}' -X "$method" \
      -H "x-api-key: $API_KEY" -H "x-controller-token: $CONTROLLER_TOKEN" -H "Content-Type: application/json" \
      -d "$body" "$API_BASE_URL$path") || fail "$method $path failed - could not reach $API_BASE_URL"
  else
    response=$(curl -sS -w '\n%{http_code}' -X "$method" \
      -H "x-api-key: $API_KEY" -H "x-controller-token: $CONTROLLER_TOKEN" \
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

echo "Sending plate '$PLATE' (direction=$DIRECTION, placement=$DETECTOR_PLACEMENT, gateMode=$GATE_MODE) to display $DISPLAY_ID ..."
SIMULATE_RESP=$(invoke_api POST "/api/remote/displays/$DISPLAY_ID/simulate" "$BODY")
COMMAND_ID=$(echo "$SIMULATE_RESP" | jq -r '.commandId')
echo "Command queued: $COMMAND_ID"

if [ "$GATE_MODE" = "wait_for_signal" ]; then
  echo ""
  echo "Gate is set to wait_for_signal — it will stay closed until you send open-gate."
  echo "NOTE: the API has no live simulation-phase feed, so watch the Display/Camera"
  echo "Mode screen yourself and only continue once the vehicle is visibly stopped"
  echo "at the gate with the plate readable."
  echo ""
  read -r -p "Press Enter to send the open-gate command (or Ctrl+C to abort without opening)... "

  echo "Sending open-gate command..."
  OPEN_RESP=$(invoke_api POST "/api/remote/displays/$DISPLAY_ID/open-gate")
  OPEN_COMMAND_ID=$(echo "$OPEN_RESP" | jq -r '.commandId')
  echo "Open-gate command queued: $OPEN_COMMAND_ID"
fi

echo ""
echo "Done."
