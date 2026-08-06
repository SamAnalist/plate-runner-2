# UI Polish Notes

Visual/UX polish pass on top of the App Shell Navigation phase. No
backend, API, pairing, command-routing, scheduler-engine, queue-logic, or
render/scene changes — this is component/CSS polish only, applied via a
new shared UI kit at `apps/web/src/components/ui/`.

## Why a shared UI kit

Before this phase, every control panel (`DisplayModePanel`,
`ControllerModePanel`, `LocalApiPanel`, `ExecutionHistoryPanel`,
`SchedulerPanel`, `PlateListsPanel`, `PlateQueuePanel`) defined its own
local `Button`/`Label` component and its own status-badge color map, with
visible drift between them. `components/ui/` consolidates that into 5
small primitives, imported everywhere instead of copy-pasted.

## Button system — `components/ui/Button.tsx`

```tsx
<Button tone="neutral | primary | danger | warn" variant="pill | solid | ghost" size="sm | md">
```

| Tone | Meaning | Example |
|---|---|---|
| `primary` | main call-to-action | Save, Send Plate, Register Display, Approve |
| `neutral` | secondary/default action | Cancel, Edit, Export, Skip |
| `danger` | destructive action | Delete, Revoke, Reject, Stop, Clear |
| `warn` | caution / attention-needed action | Pause/Resume Vehicle, Send Open Signal |

| Variant | Where used |
|---|---|
| `pill` (default) | small in-line actions inside the 7 control panels |
| `solid` | heavier calls to action — Local Mode's Start/Stop/Pause/Reset, Send Open Signal |
| `ghost` | borderless toggles — Camera Mode, Fullscreen, Debug, Loop/Run Window/Max Runs toggles |

One exception, left as-is deliberately: `DisplayModePanel`'s "↻ refresh"
link and the detector-placement/vehicle-color selection grids are true
inline text-links / selection-grid buttons, not actions in the tone
system above — forcing them into `Button` would have added visual weight
they don't need.

## Badge system — `components/ui/Badge.tsx`

```tsx
<Badge tone="neutral | success | info | warning | danger" pulse?>
```

| Tone | Used for |
|---|---|
| `success` | connected, enabled, running, started, paired |
| `info` | completed, "controlled by Plate Queue", primary Home card tag |
| `warning` | stopped, waiting_for_signal, paused |
| `danger` | error, unauthorized, failed, rejected |
| `neutral` | disconnected, pending, skipped, disabled — the fallback |

`pulse` adds `animate-pulse`, used for `running`/`started`/
`waiting_for_signal`. Every domain (API/Display connection status,
execution status, queue-item status, schedule enabled/disabled) keeps its
own small `tone: (status) => BadgeTone` mapping function local to that
panel — only the rendered pill itself is shared.

The header's status chips (`AppShell.tsx`) are a related but intentionally
separate compound element (dot + "label: value"), not `<Badge>` — they
needed a bit more visual weight for their role in the persistent header,
so they stay a distinct, purpose-built treatment documented here rather
than forced into the same component.

## Empty states — `components/ui/EmptyState.tsx`

`<EmptyState message hint? action? />` replaces bare "No X yet." text
across Plate Lists, Scheduler, Execution History, Controller's paired-
displays list, and Display's pairing-requests/paired-controllers lists.
Every one now also says what to do next (e.g. "Click + New List above to
save a reusable set of plates.").

## Header status-chip tone fix (`fix:` commit)

Before this phase, `AppShell`'s status-chip dot was always a static green
dot for any chip that was `active` (visible at all). Since a chip's
`active` flag only tracked whether a listener was *enabled*, an enabled
Local API/Display listener that was actually in an `error`/`unauthorized`
state still showed a green dot. `StatusChip` now carries a `tone`
computed in `App.tsx` from the real connection/queue status
(`connected`→success, `error`/`unauthorized`→danger, etc.), so the dot
color now means what it looks like it means. No new state was added —
this only corrects how existing state is displayed.

## Home screen

The Local Simulator card is visually promoted (gradient background,
`lg:col-span-2`, a "Start here" badge) since it's the most-used module —
every other card stays visually uniform. Each card also gets a small
two-letter monogram (no icon library added, per project constraints) for
faster visual scanning.

## Responsive — known limitation

The sidebar (`w-52`) and content area already scroll correctly at laptop
widths — verified during this phase's manual QA, not just assumed. A true
collapsed/icon-only sidebar for narrow viewports was considered and
intentionally **not implemented**: it would need either a real icon set
(the project avoids adding icon libraries) or a new interactive
collapse-toggle affordance that wasn't requested elsewhere. This is left
as a documented pending item rather than shipping a low-quality
letter-abbreviation stand-in for icons.

## Files

New: `components/ui/{Badge,Button,Label,EmptyState,FieldError}.tsx`.
Touched for visual polish only (no logic changes): the 7 control panels,
`LocalModeScreen.tsx`, `DisplayModeScreen.tsx`, `HomeScreen.tsx`,
`AppShell.tsx`, `SidebarNav.tsx`, and `App.tsx` (status-chip tone
computation only).
