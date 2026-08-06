# Demo Checklist

A 10–15 minute walkthrough for showing Plate Runner to someone new.
Assumes `pnpm dev` is already running (see
[OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md)) and the browser is at
`http://localhost:5173`.

1. **Open Home.** Point out the module cards — Local Simulator, Display
   Mode, Controller Mode, Plate Lists, Scheduler, Execution History,
   Settings/API — and that the app remembers whatever screen you leave
   it on.
2. **Local Simulator.** Open it from the Home card (it's highlighted as
   the primary entry point) or the sidebar.
3. **Run a plate.** Type a plate (e.g. `DEMO001`), click Start — car
   drives in, stops at the gate, gate opens, car exits.
4. **Run a queue.** Open Plate Queue, paste a few plates, Apply Queue,
   ▶ Run Queue — plates play one after another; show Pause/Skip/Stop.
5. **Create a Plate List.** Go to Plate Lists → + New List. Mention the
   **Random Plate Generator** in the form (count/digits/prefix) to
   quickly fill a batch of test plates, then Save.
6. **Run List.** Click ▶ Run List on the saved list — it auto-navigates
   to Local Mode so you see it run.
7. **Scheduler → Run Now.** Go to Scheduler, create a schedule against
   that list, click Run Now — again jumps to Local Mode to show it
   running.
8. **Execution History.** Show the record(s) just created, with status
   badges.
9. **Display Mode.** Open it (ideally in a second browser tab/window),
   register the display, generate a pairing code.
10. **Controller Mode.** In the first tab, open Controller Mode, enter a
    name + the 6-digit code, click Pair.
11. **Pairing manual approval.** Back on the Display tab, approve the
    pending request under Pairing Requests.
12. **Send a remote plate.** From Controller, select the paired display,
    send a single plate — it runs on the Display tab.
13. **Camera Mode.** On the Display tab, click Camera Mode — shell
    disappears, only the simulation shows; send another remote plate to
    prove listeners keep working with the UI hidden.
14. **Screen Saver.**
    - Go to Settings / API → Screen Saver, set the timeout to 1 minute
      (or the lowest custom value) for the demo.
    - Wait ~1 minute without touching anything — the overlay appears.
    - Show it exits on mouse movement, *or* send a remote command from
      Controller Mode and show the overlay closes automatically and the
      command still runs.
15. **Docker/LAN mention.** Note that the same app runs via `docker
    compose up --build`, and that Display/Controller can run on two
    separate physical devices on the same LAN — see
    [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md)'s "Real LAN
    Testing" section if asked for details, no need to actually do it live
    unless there's a second device handy.
16. **System Status.** Back in Settings / API, show System Status —
    plate/schedule/history counts, connection statuses, and the "Check
    Backend Status" button. Point out nothing sensitive (API key,
    tokens, secrets) is ever shown here or in the Export Backup JSON.
