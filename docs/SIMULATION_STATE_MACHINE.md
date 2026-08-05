# Simulation State Machine (Phase 0.5)

Reference for `useSimulation` (`apps/web/src/hooks/useSimulation.ts`) — the
single source of truth for vehicle/gate motion. This doc explains phases,
the pause/resume primitive added in this phase, timers, gate states, and how
the Plate Queue orchestrates all of it.

## Phases

```
idle
  └─(start)──► running
                 │
                 ├─(auto_open, gate closed, reaches READING_T)──► stopped_at_gate
                 │    └─(after stopBeforeOpenMs)──► gate_opening
                 │                                    └─(after delayAfterOpenMs)──► running ──► done
                 │
                 ├─(wait_for_signal, gate closed, reaches READING_T)──► waiting_for_signal
                 │    └─(openGate() / Send Signal pressed)──► gate_opening
                 │                                              └─(after delayAfterOpenMs)──► running ──► done
                 │
                 └─(hidden OR gate initially open, passes through)──► done
```

`phase` never gains a `paused` value (Option B from the spec, chosen because
it avoids touching every existing phase-based conditional in `animate()`,
`ControlPanel`, and `usePlateQueue`).

## `isPaused` — the pause overlay

`SimulationState.isPaused: boolean` is orthogonal to `phase`. Pausing never
changes `phase`; it freezes whatever is currently producing motion for that
phase:

| Phase | What's active | What pause() freezes |
|---|---|---|
| `running` | rAF loop (`animate`) | cancels the rAF frame; `vehicleT` stops advancing |
| `stopped_at_gate` | `'stopBeforeOpen'` timer (auto_open dwell) | timer frozen with remaining time recorded |
| `gate_opening` | `'resumeAfterGate'` timer (arm rise + delay) | timer frozen with remaining time recorded |
| `waiting_for_signal` | nothing (waiting on user/API) | nothing to freeze — `isPaused` just disables Send Open Signal |
| `idle` / `done` | nothing | `pause()` is a no-op (idempotent) |

`resume()` reverses exactly this, per phase, with **no restart from
scratch**: the rAF loop's `lastTimeRef` is cleared on pause so its first
resumed frame computes `dt = 0` (no jump), and gate timers resume with their
recorded remaining time (see below), not a fresh full duration.

Both `pause()` and `resume()` are idempotent no-ops outside their valid
states (see method docs in `useSimulation.ts`).

## Timers — `apps/web/src/utils/pausableTimers.ts`

A small id-keyed timer manager (`createPausableTimers()`), instantiated once
per hook via `useRef`. Used by:
- `useSimulation` — two ids: `'stopBeforeOpen'` (auto-open dwell) and
  `'resumeAfterGate'` (arm-rise + `delayAfterOpenMs`).
- `usePlateQueue` — one id: `'gap'` (inter-vehicle wait in `run_all` mode).

`pauseAll()` clears the underlying `setTimeout` and records
`remainingMs = originalMs - elapsed`. `resumeAll()` reschedules with that
exact `remainingMs` — so a gate that was 1.2s into a 2s auto-open dwell
resumes with 0.8s left, not a fresh 2s. This is what satisfies "gate timers
don't keep advancing while paused" and "gap between vehicles continues with
its remaining time" without hand-rolling the bookkeeping twice.

## Gate states + pause interaction

- **hidden** — no gate logic at all; pause only affects the rAF loop.
- **initially open** — same; the vehicle never stops, pause only affects the rAF loop.
- **closed + `auto_open`** — pause is meaningful at three points: while approaching (rAF), while dwelling at `stopped_at_gate` (`'stopBeforeOpen'` timer), and while the arm is rising at `gate_opening` (`'resumeAfterGate'` timer). All three freeze correctly per the table above.
- **closed + `wait_for_signal`** — pause while `waiting_for_signal` has nothing to freeze (the phase itself is inert until a signal), but **disables Send Open Signal** (`openGate()` no-ops while `isPaused`, and the button is `disabled` in `ControlPanel`). Decision: the signal is neither applied nor queued while paused — the user must resume first. This avoids a signal being "banked" and firing unexpectedly mid-freeze.

## Queue integration — `usePlateQueue`

`pauseQueue()`/`resumeQueue()` now do real work instead of only blocking
advancement:
- `pauseQueue()` → `queueTimers.pauseAll()` (freezes the gap timer if one is
  active) + `simulation.pause()` (freezes the vehicle/gate timers if
  active) + `queueStatus = 'paused'`.
- `resumeQueue()` → `queueTimers.resumeAll()` + `simulation.resume()` +
  `queueStatus` restored to `'running'` or `'waiting_for_signal'` depending
  on `simulation.state.phase`.

Because the gap timer itself is pausable-with-remaining-time, resuming it
naturally fires `advance()` again once its remaining time elapses — no
separate "replay the pending advance" bookkeeping is needed. (The previous
phase's `pendingAdvanceRef` hack is gone.)

**Skip Current while paused**: `skipCurrent()` now works from `paused` too.
It's treated as an explicit override — it cancels the current vehicle
(`simulation.reset()`, which also clears `isPaused`), marks it `skipped`,
and advances normally, i.e. skipping always leaves the queue running
afterward, even if it was paused. This was the simplest, least-surprising
behavior and is called out here as a deliberate decision.

**Stop / Reset while paused**: `stopQueue()` calls `simulation.reset()`,
which fully clears `isPaused` as part of its state reset — no special
handling needed. `resetQueue()` only resets item statuses (unchanged
behavior); it does not touch the live simulation, so if called while paused,
the frozen vehicle remains frozen until the user explicitly resumes or
resets it via the (now re-enabled, since `queueStatus` becomes `'idle'`)
manual controls.

## Known limitations

- Pausing mid-`gate_opening` freezes the arm's CSS transition at the DOM/CSS
  layer as a visual side-effect of stopping time passing, but there is no
  explicit CSS-pause hook — the arm's rise animation may complete its CSS
  transition even though the *logical* resume timer is frozen, since the
  animation is a fixed-duration CSS transition triggered once at
  `gate_opening` entry, not driven frame-by-frame. In practice `gate_opening`
  is a short (850ms) phase and this was not observed to cause a visible
  mismatch during manual QA, but it's a known simplification: only the
  *logical* timer (`resumeAfterGate`) is guaranteed frozen, not necessarily
  every CSS animation still mid-flight.
- `resetQueue()` does not cancel a paused vehicle (see above) — by design,
  since Reset Status is scoped to item statuses, not simulation lifecycle.
