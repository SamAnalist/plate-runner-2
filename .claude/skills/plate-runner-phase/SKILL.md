---
name: plate-runner-phase
description: Close out a work phase on Plate Runner the way this project requires — locate the right doc(s) to update via the Documentation Index, append a properly-formatted docs/PROGRESS.md entry, and produce the standard end-of-phase report. Use whenever a Plate Runner feature/fix/change is functionally done and needs its required documentation pass before being considered complete (per CLAUDE.md/AGENTS.md/GEMINI.md: "if you implement without updating docs, the phase is incomplete").
---

# Plate Runner: Close Out a Phase

This project (see `CLAUDE.md`, `AGENTS.md`, `GEMINI.md` at the repo root —
they're kept in sync, read whichever matches your tool) requires every
phase of work to end with a documentation pass. This skill is that ritual,
made concrete with real examples from this repo's own history so it's a
checklist, not a vague reminder.

## When to use this

Right after finishing a feature, fix, or refactor on Plate Runner — before
telling the user it's done. Not for exploratory/read-only work.

## Steps

### 1. Identify which doc(s) need updating

`docs/PROGRESS.md` is **always** required — it's the single append-only
history of every phase. Beyond that, check the Documentation Index in
`CLAUDE.md`/`AGENTS.md`/`GEMINI.md` for a topic match and extend that doc
too, in the same style already used there (most are their own append-only
phase logs, not living reference docs you rewrite — read a doc's existing
entries before adding to it, to match its format).

Common matches:
- Touched simulation/rendering (scenes, vehicle assets, gate, motion) →
  `docs/SIMULATION_SPEC.md` and/or `docs/VEHICLE_COLOR_VARIANTS.md` /
  `docs/RENDERER_ARCHITECTURE.md`.
- Touched a backend route or the command queue → `docs/BACKEND_API_SPEC.md`
  and/or `docs/REMOTE_COMMANDS_SPEC.md` / `docs/API_COMMANDS_SPEC.md`.
- Touched pairing/auth → `docs/PAIRING_SPEC.md`.
- Touched plate lists/scheduler/history/queue → the matching `*_SPEC.md`.
- Touched the CLI scripts → `docs/CONTROLLER_CLI_TOOLS.md`.
- Touched deployment/env vars → `DEPLOYMENT.md` (repo root).
- Fixed a bug whose root cause isn't obvious from the diff alone (e.g. a
  timing/race issue, a z-order issue, an auth-header gap) → write the root
  cause into the `PROGRESS.md` entry itself, don't just say "fixed X" —
  future agents (and the user) need the *why*, not just the *what*.

### 2. Append the `docs/PROGRESS.md` entry

Format (copy this shape exactly — `docs/PROGRESS.md` has ~15 real entries
in this format already, skim a recent one for tone/depth before writing
yours):

```md
---

## Phase — <short, specific title>

**Date:** <YYYY-MM-DD>

### Goal

<1-3 sentences: what was this phase trying to accomplish, and why>

### Implemented

- <Item 1 — be specific: file/behavior, not just "added X">
- <Item 2>

### Files Changed

- `path/to/file.tsx` — <reason, not just "modified">

### Decisions

- <Any non-obvious choice and why — this is the part that saves the next
  agent from re-deriving or re-litigating something you already decided>

### Manual Testing

- <What was actually run/verified — `tsc --noEmit`, `pnpm build`, a
  described manual click-through. Say explicitly if something is
  UNVERIFIED (e.g. "not tested on a real Windows machine — no environment
  available") rather than implying it was tested.>

### Known Limitations

- <Anything intentionally left incomplete or approximate>

### Next Steps

- <Concrete follow-up, if any>
```

Real example (abbreviated) from this repo's own `docs/PROGRESS.md`,
showing the expected level of specificity for a bug-fix phase:

```md
## Phase — Fix silently-dropped back-to-back run commands

### Goal

Fix a reported bug: sending 2+ `run_plate` commands back-to-back only
ever played the first — the pending counter briefly showed the correct
count, then dropped to 0 without the 2nd+ plate ever running.

### Implemented

- **Root cause**: `runLocalAction` (`commandExecutor.ts`) guards run
  commands with a "busy" check — if busy, it returned `{ status: 'failed',
  error: 'local_queue_busy' }`. Both command listeners called `claim()`
  BEFORE this check, so the 2nd command was claimed, immediately failed,
  and permanently removed from `pending` without ever running.
- **Fix**: added `isRunCommandBusy()`, checked BEFORE calling `claim()`.
  If busy, the command is left `pending` entirely and retried on the next
  poll tick.
```

Note the shape: a bug-fix entry states the *root cause* explicitly, not
just "fixed the bug" — that's what makes `PROGRESS.md` actually useful to
read later instead of just a changelog.

### 3. Verify before reporting done

Run whatever's relevant and say so in Manual Testing:
- `pnpm --filter web exec tsc --noEmit`
- `pnpm --filter server exec tsc --noEmit` (if server touched)
- `pnpm --filter shared exec tsc --noEmit` (if shared types touched)
- `pnpm build`

Don't claim a UI change was visually verified unless you actually ran the
app and looked — if you can't (no browser/display available), say so
explicitly rather than implying it was checked.

### 4. Produce the end-of-phase report

Use this exact structure (from `CLAUDE.md`'s "Response Format After Each
Phase" — same in `AGENTS.md`/`GEMINI.md`):

```md
# Phase Completed: <name>

## Summary
## Files Created/Modified
## Technical Decisions
## How to Run
## How to Test Manually
## Known Limitations
## Bugs/Risks
## Commits
## Recommended Next Phase
```

Do not hide incomplete work — if something is untested or approximate
(e.g. a starting-value constant the user is expected to tune, like
`VEHICLE_TYPE_SCALE_MULTIPLIER` or a `gate.t` value), say so in Known
Limitations rather than presenting it as finished.

### 5. Commit — only if the user asked for it

Small, scoped commits, one logical change each — see `CLAUDE.md`'s Commit
Requirements for message style. Never push without an explicit ask in
that same turn, even if a prior turn approved a push.
