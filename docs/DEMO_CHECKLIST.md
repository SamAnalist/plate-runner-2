# Demo Checklist

A guided, narrated demo — about 10–15 minutes total. Assumes `pnpm dev`
is already running (see [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md)) and
the browser is at `http://localhost:5173`. Times below are per-block
budgets, not hard stops — skip a step if the audience already gets it.

## Block 1 — What is Plate Runner? (~2 min)

1. **Open Home.** "Plate Runner simulates a car and license plate on
   screen, for testing cameras/ANPR readers — locally, or as a remote
   display another computer controls." Point out the module cards; the
   **Local Simulator** card is highlighted as the starting point.
2. **Open Local Simulator** from its Home card or the sidebar.

## Block 2 — Local Simulation (~3 min)

3. **Run a single plate.** Type a plate (e.g. `DEMO001`), click Start —
   car drives in, stops at the gate, gate opens, car exits. Point out
   the small hover-revealed **Play/Pause** control in the scene's
   top-right corner as a shortcut.
4. **Run a queue.** Open Plate Queue, paste a few plates, Apply Queue,
   ▶ Run Queue — plates play one after another; show Pause/Skip/Stop
   (including the same Skip shortcut in the corner widget while a queue
   is running).

## Block 3 — Saved Lists, Scheduling, History (~4 min)

5. **Save a Plate List.** Plate Lists → + New List. Show the **Random
   Plate Generator** in the form — set a count/digit length/prefix, click
   Generate — a quick way to fill test plates without typing. Save.
6. **Run List.** Click ▶ Run List — auto-navigates to Local Mode so you
   see it run.
7. **Scheduler → Run Now.** Create a schedule against that list, click
   Run Now — again jumps to Local Mode.
8. **Execution History.** Show the record(s) just created, with status
   badges.

## Block 4 — Screen Saver (~1–2 min)

9. Go to Settings / API → Screen Saver, set the timeout to its lowest
   value for the demo. Wait for the overlay to appear, then show it
   exits on mouse movement — mention it also exits automatically the
   moment a remote command arrives (shown next).

## Block 5 — Remote Mode (~4 min)

10. **Display Mode.** Open it (ideally a second browser tab/window),
    register the display, generate a pairing code.
11. **Controller Mode.** In the first tab, open Controller Mode, enter a
    name + the 6-digit code, click Pair.
12. **Manual pairing approval.** Back on the Display tab, approve the
    pending request under Pairing Requests.
13. **Send a remote plate.** From Controller, select the paired display,
    send a single plate — it runs on the Display tab. If the Screen
    Saver was showing there, note that it closes automatically.
14. **Camera Mode.** On the Display tab, click Camera Mode — the shell
    disappears, only the simulation shows; send another remote plate to
    prove listeners keep working with the UI hidden.

## Block 6 — Wrap-up (~1 min)

15. **System Status.** Back in Settings / API, show System Status —
    connection statuses and counts, and that nothing sensitive (API key,
    tokens, secrets) is ever shown here or in Export Backup's JSON.
16. **Docker/LAN mention.** Note the same app runs via `docker compose
    up --build`, and that Display/Controller can run on two separate
    physical devices on the same LAN — see
    [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)'s "Real LAN
    Testing" section if asked, no need to demo it live unless a second
    device is handy.
