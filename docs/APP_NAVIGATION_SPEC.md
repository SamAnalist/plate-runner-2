# App Navigation Spec

How the frontend shell is structured after the App Shell Navigation phase:
a header + sidebar + 8 screens, replacing the old three-tab
(Local/Display/Controller) header with a single mega-panel underneath.

Every button, badge, and empty state described below is rendered through
a small shared UI kit at `apps/web/src/components/ui/` (`Button`,
`Badge`, `Label`, `EmptyState`, `FieldError`) — see
[UI_POLISH_NOTES.md](UI_POLISH_NOTES.md) for the tone/variant system.

## Screens

```ts
type AppScreen =
  | 'home' | 'local' | 'display' | 'controller'
  | 'lists' | 'scheduler' | 'history' | 'settings';
```

Defined in [`apps/web/src/navigation/appScreens.ts`](../apps/web/src/navigation/appScreens.ts)
alongside `APP_SCREENS`, an array of `{ id, label, description }` used by
both the sidebar and the Home screen's cards.

| Screen | File | Contains |
|---|---|---|
| `home` | `screens/HomeScreen.tsx` | Cards linking to the other 7 screens, each with a light live-status line |
| `local` | `screens/LocalModeScreen.tsx` | `SimulationScene` + plate/direction/detector/gate/vehicle-color/visual-settings/playback/Plate Queue controls |
| `display` | `screens/DisplayModeScreen.tsx` | `SimulationScene` + `DisplayModePanel` (registration, pairing requests, paired controllers, listener) |
| `controller` | `screens/ControllerModeScreen.tsx` | `ControllerModePanel` (pair, send plate/queue/list, remote controls) — no scene |
| `lists` | `screens/PlateListsScreen.tsx` | `PlateListsPanel` (create/edit/import/export/run) |
| `scheduler` | `screens/SchedulerScreen.tsx` | `SchedulerPanel` (create/edit/enable/disable/run now) |
| `history` | `screens/ExecutionHistoryScreen.tsx` | `ExecutionHistoryPanel` |
| `settings` | `screens/SettingsScreen.tsx` | `LocalApiPanel`, `SystemStatusPanel`, `ScreenSaverSettingsPanel`, `BackupPanel`, `LocalStorageManagementPanel` — see [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) |

Every screen is a thin wrapper around an existing, unmodified panel
component — none of `PlateInput`, `PlateQueuePanel`, `PlateListsPanel`,
`SchedulerPanel`, `ExecutionHistoryPanel`, `LocalApiPanel`,
`DisplayModePanel`, or `ControllerModePanel` changed. `LocalModeScreen.tsx`
is the direct successor to the deleted `ControlPanel.tsx`, minus the four
sections (Plate Lists, Scheduler, Execution History, Local API) that moved
to their own screens.

## Layout — `components/layout/`

- **`AppShell.tsx`** — top header (brand + version + live status chips) and,
  below it, `SidebarNav` + a scrollable content area holding the active
  screen.
- **`SidebarNav.tsx`** — three grouped sections: Modes (Home, Local,
  Display, Controller), Data (Plate Lists, Scheduler, Execution History),
  Settings. Pure/presentational — no hook imports.

Both replace the old inline header tab-switcher (`UsageMode`) in `App.tsx`.

## Last-screen persistence

`apps/web/src/hooks/usePersistentAppScreen.ts` reads/writes
`localStorage["plate-runner:last-screen:v1"]`, a plain `AppScreen` string.

- On mount: read the key, validate it against `APP_SCREENS` via
  `isAppScreen()`; missing key, corrupted value, or unrecognized id all
  fall back to `'home'`.
- Every navigation writes through immediately.
- **`appMode`** (`'normal' | 'fullscreen' | 'camera'`, still owned by
  `App.tsx` exactly as before this phase) is deliberately **not**
  persisted. A reload always lands on the last normal `AppScreen` with the
  shell visible — never stuck in Camera Mode or Fullscreen.

## Camera Mode / Fullscreen

Unchanged mechanism: `App.tsx` renders either `normalLayout` (now
`<AppShell>` wrapping the active screen) or `expandedLayout` (a full-screen
`SimulationScene`) based on `appMode`. `expandedLayout` doesn't know about
`AppScreen` at all — the sidebar, header, and every screen's own chrome all
disappear together whenever `appMode !== 'normal'`, satisfying "hide
navigation/menus in Camera Mode/Fullscreen" without any new code path.

## Shared state

All singleton hooks (`useSimulation`, `usePlateQueue`,
`useExecutionHistory`, `usePlateLists`, `useLocalScheduler`,
`useApiCommandListener`, `useDisplayCommandListener`,
`useRemoteController`) are still instantiated exactly once at the top of
`App()`, in the same order as before. Screens receive only the hooks they
need as props — no Context/Provider was introduced; one level of
prop-drilling was enough at this size. Nothing about background polling
(scheduler tick, API/Display listener polling, queue phase watchers)
changes — it keeps running regardless of which screen is on-screen.

The header's status chips (Local API, Display, Queue) are the visible
proof of this: they read the same hook state and stay lit up no matter
which screen you navigate to.

## "Run" auto-navigates to Local

`PlateListsScreen` wraps `plateLists.runList` and `SchedulerScreen` wraps
`scheduler.runNow` so that clicking Run/Run Now also calls
`setScreen('local')` before running — since Lists and Scheduler are now
separate screens from Local, this keeps the existing "you see the car run
after you click Run" experience. `loadListIntoQueue` is untouched (no
navigation) since it doesn't start playback.

## Screen Saver overlay

`ScreenSaverOverlay` (in `components/screensaver/`) renders as a sibling
at the very top of `App.tsx`'s return, outside both `normalLayout` and
`expandedLayout` — so it covers Camera Mode/Fullscreen exactly the same
way it covers the normal shell, with no changes to either layout. See
[SCREEN_SAVER_SPEC.md](SCREEN_SAVER_SPEC.md) for the full behavior.
