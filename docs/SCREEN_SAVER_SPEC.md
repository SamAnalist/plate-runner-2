# Screen Saver Spec

## Motivation

Plate Runner can legitimately be left open for hours — a Display Mode
screen pointed at a camera, or a Local Mode simulation between demos.
Without something moving on screen, that's a static frame for a long
time. The Screen Saver shows a lightweight, full-screen, CSS-only
animation after a configurable period of inactivity, and gets out of the
way instantly the moment anything happens — mouse, keyboard, touch, or a
remote command.

## Settings

Configured on the **Settings / API** screen, under **Screen Saver**.
Persisted to `localStorage["plate-runner:screensaver:v1"]`:

```ts
type ScreenSaverStyle = 'floating_plate' | 'moving_logo' | 'subtle_gradient';

interface ScreenSaverSettings {
  enabled: boolean;
  timeoutMinutes: number; // clamped to [1, 60]
  style: ScreenSaverStyle;
  updatedAt: string;
}
```

Default: `{ enabled: true, timeoutMinutes: 10, style: 'floating_plate' }`.
A missing key, corrupted JSON, an out-of-range `timeoutMinutes`, or an
unrecognized `style` all fall back to this default (or, for
`timeoutMinutes` alone, get clamped rather than fully reset) — same
corrupted-storage recovery pattern used everywhere else in the app.

All three styles are implemented (`floating_plate`, `moving_logo`,
`subtle_gradient`) — pure CSS `@keyframes`, no canvas, no Three.js, no
network requests.

## Activity detection

Implemented in `apps/web/src/features/screensaver/useScreenSaver.ts`.
Two activity channels feed the same idle timer:

1. **DOM events** — window-level `mousemove`, `mousedown`, `keydown`,
   `touchstart`, `wheel` listeners (throttled to one timer-reset per
   250ms so `mousemove` doesn't spam re-renders).
2. **App-level `notifyActivity()`** — called from one `useEffect` in
   `App.tsx` whenever any of these change: `displayCommandListener
   .lastCommandAt` (a remote command executed), `apiCommandListener
   .pendingCount` (a Local API command arrived), `plateQueue.queueStatus`
   (a queue/simulation started), `simulation.state.phase`, `display
   CommandListener.pairingRequests.length` (a pairing request appeared),
   and the active `screen` (navigating between app screens counts as
   activity too).

This covers every source listed in the original requirement — mouse
move, click, keydown, touch, wheel, screen navigation, queue starts,
simulation starts, remote commands, API commands, and pairing requests —
without hand-wiring each one separately.

## When it does NOT activate ("busy")

`App.tsx` computes a single `busy` boolean passed into the hook:

```ts
busy = simulation.state.isRunning
  || ['stopped_at_gate', 'waiting_for_signal', 'gate_opening'].includes(simulation.state.phase)
  || queueActive
  || displayCommandListener.pairingRequests.length > 0
```

The idle-timeout tick never activates the Screen Saver while `busy` is
true, and a `useEffect` watching `busy` **force-dismisses** it
immediately if the app becomes busy while it's already showing (e.g. a
remote command starts a run right as the timeout would have fired).

It also never activates while `document.activeElement` is a text
input/textarea/select — so leaving a form field focused (without typing)
doesn't trigger it either.

## Remote command behavior

If a remote or Local API command arrives while the Screen Saver is
active: the command's own state changes (`lastCommandAt`, `queueStatus`,
`simulation.state.phase`) flow through the same activity effect above,
which calls `notifyActivity()` and clears `isActive` — so it closes
automatically, and the command executes exactly as it would have with
the Screen Saver never having appeared. Verified manually: enabling the
Local API listener, letting the Screen Saver activate, then `POST
/api/simulate`-ing a plate — the overlay disappears within one poll
cycle (~1.5s) and the plate updates correctly.

## Exiting

Any of: mouse move/click, keydown, touch, wheel, or a remote/API command
dismisses it. It never changes the persisted app screen — dismissing
just hides the overlay and returns to whatever screen/layout (normal,
Fullscreen, or Camera Mode) was already showing underneath.

## Visual

`apps/web/src/components/screensaver/ScreenSaverOverlay.tsx` — a `fixed
inset-0 z-[100]` div (above the Camera/Fullscreen layout's `z-50`, so it
covers those too), no sidebar/header, no real queue/plate/history data
(the component takes only a `style` prop — it has no access to sensitive
state by construction). Three CSS-only styles: a slowly bouncing/drifting
fake plate reading "READY", a floating "Plate Runner" wordmark, or a
slow animated gradient — each with a generic "Waiting for signal…"
line.

## Camera Mode / Display Mode

The overlay renders as a sibling at the top of `App.tsx`'s return,
independent of whether the underlying layout is normal, Fullscreen, or
Camera Mode — so it works identically in Display Mode/Camera Mode
without any changes to either layout's own code. It hides no controls
that weren't already hidden by Camera Mode itself.

## Security — no sensitive data

The overlay component never receives the queue, plate, execution
history, API key, controller tokens, display secrets, or pairing codes
as props — there is nothing sensitive it could render even by accident.
Verified in manual QA by inspecting the overlay's rendered text while
active.

## Known limitations

- The 5-second idle-check tick means activation can lag the configured
  timeout by up to ~5 seconds — acceptable for a multi-minute default.
- `subtle_gradient` and `moving_logo` are implemented but not deeply
  visually tuned — `floating_plate` is the recommended default and got
  the most attention.
