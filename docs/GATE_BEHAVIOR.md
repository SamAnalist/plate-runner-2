# Gate Behavior — Plate Runner

**Phase:** 0.9 — Gate Behavior & POV Motion Polish
**Date:** 2026-07-05

---

## 1. Overview

The gate has three independent axes of configuration:

| Axis | Type | Values | Field |
|---|---|---|---|
| Visibility / mode | `GateMode` | `hidden`, `auto_open`, `wait_for_signal` | `config.gateMode` |
| Initial arm state | `GateInitialState` | `open`, `closed` | `config.gateInitialState` |
| Stop-before-open duration | `number` | ms (default 2000) | `config.stopBeforeOpenMs` |
| Delay after arm rises | `number` | ms (default 400) | `config.delayAfterOpenMs` |

---

## 2. Gate Scenarios

### Scenario 1 — Hidden

```
gateMode: 'hidden'
```

- Gate arm is not rendered.
- Vehicle passes through without stopping.
- No timer. No button. No wait.
- `gateInitialState`, `stopBeforeOpenMs`, `delayAfterOpenMs` are ignored.

**Phases:** `idle → running → done`

---

### Scenario 2 — Visible + Initially Open

```
gateMode: 'auto_open' | 'wait_for_signal'
gateInitialState: 'open'
```

- Arm starts raised (80° rotation) at the beginning of the run.
- Vehicle passes without stopping.
- `stopBeforeOpenMs` and `delayAfterOpenMs` are ignored.

**Phases:** `idle → running → done`

**Note:** even if `gateMode` is `wait_for_signal`, the open initial state means no stop occurs.

---

### Scenario 3 — Visible + Closed + Auto Open

```
gateMode: 'auto_open'
gateInitialState: 'closed'
```

**Sequence:**

1. Arm starts closed (horizontal).
2. Vehicle enters POV.
3. Vehicle reaches `READING_T` (`t ≈ 0.46` incoming, `t ≈ 0.58` away).
4. Vehicle stops. Phase: `stopped_at_gate`.
5. Timer runs for `stopBeforeOpenMs` (default 2000ms).
6. Arm rises. Phase: `gate_opening`. Timer: `850ms (arm animation) + delayAfterOpenMs`.
7. Vehicle resumes. Phase: `running`.
8. Vehicle exits POV. Phase: `done`.

**Configurable timings:**

| Setting | Default | UI slider range |
|---|---|---|
| `stopBeforeOpenMs` | 2000ms | 200–8000ms |
| `delayAfterOpenMs` | 400ms  | 0–3000ms |

**Gate open animation:** 850ms Framer Motion ease [0.4, 0, 0.2, 1]. Fixed — not configurable.

---

### Scenario 4 — Visible + Closed + Wait For Signal

```
gateMode: 'wait_for_signal'
gateInitialState: 'closed'
```

**Sequence:**

1. Arm starts closed (horizontal).
2. Vehicle enters POV.
3. Vehicle reaches `READING_T`.
4. Vehicle stops indefinitely. Phase: `waiting_for_signal`.
5. UI shows **"Send Open Signal"** button.
6. Operator (or future API) sends signal → `openGate()` called.
7. Arm rises. Phase: `gate_opening`. Timer: `850ms + delayAfterOpenMs`.
8. Vehicle resumes. Phase: `running`.
9. Vehicle exits POV. Phase: `done`.

**Future API trigger:**
```http
POST /api/v1/events/:eventId/open-gate
```
This call will invoke `openGate()` via WebSocket or HTTP callback. Not yet implemented.

---

## 3. Simulation Phase State Machine

```
idle
  └─(start)──► running
                 │
                 ├─(auto_open, gate closed, t reaches READING_T)──► stopped_at_gate
                 │    └─(after stopBeforeOpenMs)──► gate_opening
                 │                                    └─(after 850ms + delayAfterOpenMs)──► running ──► done
                 │
                 ├─(wait_for_signal, gate closed, t reaches READING_T)──► waiting_for_signal
                 │    └─(openGate() / Send Signal pressed)──► gate_opening
                 │                                              └─(after 850ms + delayAfterOpenMs)──► running ──► done
                 │
                 └─(hidden OR gate initially open — passes through)──► done
```

### Phase Labels

| Phase | Display | Description |
|---|---|---|
| `idle` | Idle | Not started |
| `running` | Running | Vehicle moving |
| `stopped_at_gate` | Stopped at gate | Auto-open: counting down `stopBeforeOpenMs` |
| `waiting_for_signal` | Waiting for signal | Wait-for-signal: paused, Send Signal button visible |
| `gate_opening` | Gate opening | Arm rising, post-open delay counting |
| `done` | Vehicle passed | Simulation complete |

---

## 4. Gate Arm Visual (Phase 0.9)

| State | Arm color | Stripes | Angle | LED |
|---|---|---|---|---|
| Closed | White (`#f0f0f0`) | Red (`#cc2222`) diagonal | 0° (horizontal) | Red `#f87171` (soft) |
| Open | White (`#f0f0f0`) | Red (`#cc2222`) diagonal | −80° (nearly vertical) | Green `#4ade80` (soft) |

Design intent: white/red parking barrier style. Soft LED (low opacity halo) avoids camera sensor bleed on bright/neon colors.

---

## 5. Camera Focus Zone (Removed — Phase 0.9)

The Camera Focus Zone UI section was removed from the main control panel in Phase 0.9.

- `FocusZoneOverlay.tsx` and `FocusZoneControls.tsx` are retained in the codebase as legacy components.
- `FocusZoneConfig` type and `DEFAULT_FOCUS_ZONE` are retained in `packages/shared` for future use (e.g., API-driven calibration, automated readability tests).
- `getPlateReadability()` is retained in `depth.ts` for internal use.
- Neither the overlay nor the controls are rendered or accessible to end users in the current UI.

---

## 6. How to Test Each Scenario

### Hidden

1. Set Gate → **Hidden**
2. Press Start
3. Verify: vehicle passes without stopping, no arm visible

### Visible + Initially Open

1. Set Gate → **Auto Open**
2. Set Initial State → **Open**
3. Press Start
4. Verify: arm starts raised at 80°, vehicle passes without stopping

### Visible + Closed + Auto Open

1. Set Gate → **Auto Open**
2. Set Initial State → **Closed**
3. Set Stop Before Opening → **2000ms** (or any value)
4. Press Start
5. Verify:
   - Vehicle stops at gate
   - Status label shows "STOPPED AT GATE"
   - After ~2s: arm rises with animation
   - Status label shows "GATE OPENING"
   - After arm completes + delay: vehicle resumes
   - Vehicle exits POV

### Visible + Closed + Wait For Signal

1. Set Gate → **Wait Signal**
2. Set Initial State → **Closed**
3. Press Start
4. Verify:
   - Vehicle stops at gate
   - Status shows "WAITING FOR SIGNAL" (yellow, in scene and playback status)
   - **"Send Open Signal"** button appears (yellow, animated)
5. Press Send Open Signal
6. Verify:
   - Status shows "GATE OPENING"
   - Arm rises
   - Vehicle resumes and exits

---

## 7. Away Direction

Gate logic is symmetric for `away` direction (vehicle moves t: 1→0):
- Reading position for away: `READING_T_AWAY = 0.58`
- Vehicle stops at `READING_T_AWAY` instead of `READING_T_INCOMING`
- All scenarios (hidden, open, auto_open, wait_for_signal) behave identically

---

## 8. API Readiness

The `waiting_for_signal` scenario is designed to accept remote gate signals:

```ts
// Current: local button calls simulation.openGate()
// Future: API webhook → openGate() via store/event bus
simulation.openGate();
```

The simulation engine is fully decoupled from the signal source. Any future backend, WebSocket, or remote trigger only needs to call `openGate()`.

---

## 9. Plate Queue Interaction (Phase 0.4)

The local Plate Queue (`docs/QUEUE_SPEC.md`) plays multiple plates through
this same gate logic sequentially, without changing any of the above:

| Gate config | Queue behavior |
|---|---|
| `hidden` | Vehicle passes straight through; queue advances after the gap. |
| Visible, initially open | Same — never stops. |
| Visible, closed, `auto_open` | Vehicle stops/opens/resumes exactly as in §1–4 above; queue just waits for `phase === 'done'` and advances. |
| Visible, closed, `wait_for_signal` | Vehicle stops at `waiting_for_signal`; the queue mirrors this in its own status and waits for the same **Send Open Signal** button described in §6. Nothing about the signal flow changes — the queue only observes `simulation.state.phase`. |
