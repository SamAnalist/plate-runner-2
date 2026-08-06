# Manual Testing Guide

A step-by-step guide for testing Plate Runner by hand — no code knowledge
required. If you can use a web browser and a terminal to copy-paste
commands, you can follow this.

For the results of the most recent full QA pass, see
[RELEASE_CANDIDATE_QA.md](RELEASE_CANDIDATE_QA.md).

## 1. Starting the app

Open a terminal in the project folder and run:

```bash
pnpm install
pnpm dev
```

Wait until you see two "ready" messages — one for the web app
(`http://localhost:5173`) and one for the backend server
(`http://localhost:8787`). Open `http://localhost:5173` in your browser.

You should see the Plate Runner interface: a **Home** screen with cards for
every module, and a sidebar on the left listing them all — **Local**,
**Display**, **Controller**, **Plate Lists**, **Scheduler**, **Execution
History**, **Settings / API**. Click a card or a sidebar item to open that
screen; the app remembers the last screen you had open and returns to it
on reload.

## 2. Local Mode — the basics

Local Mode (open it from the sidebar or the Home screen's "Local
Simulator" card) is one computer showing and controlling its own
simulation.

1. In the **License Plate** box, type `ABC123` and click **Start**. A blue
   car should drive in, stop at the gate, the gate arm should rise, and the
   car should drive through and disappear.
2. Try typing an invalid plate like `abc-123` (lowercase and a hyphen). The
   box should turn red-bordered and show an error message — the car should
   NOT start with that plate.
3. In **Direction**, switch between **Incoming** and **Away** — notice the
   **Detector Placement** buttons below change (front-facing options for
   Incoming, back-facing for Away).
4. In **Gate Settings**, try each gate mode: **Hidden** (no gate, car just
   drives through), **Auto Open** (car stops, gate rises by itself), **Wait
   Signal** (car stops and waits — you have to click a yellow "Send Open
   Signal" button to let it through).
5. In **Visual Settings → Vehicle Color**, click the red and gray dots —
   notice a small note appears saying there's no dedicated asset yet (the
   car still renders blue). This is expected, not a bug.
6. Hover the top-right corner of the scene itself — a dim dot expands
   into a small Play/Pause (and, while a queue is running, Skip)
   control. It mirrors the same Playback buttons in the side panel.

## 3. Plate Queue — running many plates in a row

1. On the Local screen, open the **Plate Queue** section in the right-hand panel.
2. In the text box, paste:
   ```
   ABC123
   XYZ999
   TEST01
   ```
3. Click **Apply Queue** — you should see "Queue Items (3)" below.
4. Click **▶ Run Queue** — plates should run one after another automatically.
5. While it's running, try **⏸ Pause Vehicle** (freezes mid-motion), **⏭
   Skip Current** (jumps to the next plate), and **■ Stop Queue**.
6. Switch **Mode** to **Manual Next**, apply the queue again, and click
   **▶ Run Queue**. After the first plate finishes, the queue should show
   status `WAITING_FOR_NEXT` — click **⏩ Next Vehicle** to advance to the
   second plate manually. (This exact flow had a bug that was found and
   fixed during the Release Candidate QA pass — if "Next Vehicle" ever does
   nothing, that's a serious regression, report it immediately.)

## 4. Plate Lists — saving reusable sets of plates

1. Open the **Plate Lists** screen from the sidebar, click **+ New List**.
2. Try the **Random Plate Generator** inside the form: set a count, a
   digit count, and an optional prefix (e.g. `GE`), click **Generate** —
   the Plates box fills with that many unique plates matching
   `PREFIX+digits` (no hyphens — plates are A–Z0–9 only).
3. Give it a name, pick a direction/color/gate, click **Save List**.
4. On the saved list card, try **Run List** (starts playing immediately),
   **Load Into Queue** (fills the queue but doesn't start it), **Edit**,
   **Duplicate**, and **Delete**.
5. Click **ⓘ Format** next to Import JSON — it should show the expected
   JSON shape (single list vs. collection export).
6. Click **Export All**, then **Import JSON** and pick the file you just
   downloaded — it should re-import without duplicating incorrectly.
7. Reload the page — your saved lists should still be there.

## 5. Scheduler — automatic timed runs

1. Create a Plate List first (see above) if you haven't.
2. Open the **Scheduler** screen from the sidebar, click **+ New Schedule**.
3. Pick a Plate List, set **Run Mode** to **Repeat interval**, set it to
   `10` seconds, and enable **Max Runs** at `2`.
4. Save it and watch — it should fire automatically after ~10 seconds, then
   again ~10 seconds later, then show status **disabled** (it stops itself
   after reaching Max Runs).
5. Try **Run Now** on any schedule — it runs immediately, but does NOT
   count against that schedule's run counter (this is intentional).
6. Open the **Execution History** screen from the sidebar — you should see a record for each run.

## 6. Local API — controlling the app from a script

This lets an external script drive the simulation via the local backend
(same computer, different process).

1. Open the **Settings / API** screen from the sidebar, click **Test Connection** —
   it should say `connected`.
2. Click **Listen for API Commands**.
3. In a terminal, run:
   ```bash
   curl -X POST http://localhost:8787/api/simulate \
     -H "x-api-key: dev-local-key" -H "Content-Type: application/json" \
     -d '{"plate":"API0001","direction":"incoming","detectorPlacement":"center_front","vehicleColor":"blue","gateConfig":{"gateMode":"auto_open","gateInitialState":"closed","stopBeforeOpenMs":2000,"delayAfterOpenMs":400},"queueConfig":{"mode":"run_all","gapBetweenVehiclesMs":500,"loop":false}}'
   ```
4. Within about 2 seconds, the car in your browser should start running
   with plate `API0001` — the frontend picked up the command automatically.

## 7. Remote Mode — one computer controls another

This needs two browser tabs (or two computers on the same network). We'll
use two tabs for this guide.

### On the Display screen

1. Open a new tab to `http://localhost:5173`, open the **Display** screen from the sidebar.
2. Under **Register This Display**, type a name (e.g. "Front Gate") and
   click **Register Display**.
3. Click **Generate Pairing Code** — a large 6-digit code appears with a
   5-minute countdown.
4. Click **Listen for Remote Commands**.
5. Keep this tab open and visible.

### On the Controller screen

1. Go back to your first tab, open the **Controller** screen from the sidebar.
2. Type a controller name (e.g. "My Laptop") and the 6-digit code from the
   Display screen, click **Pair**.
3. You'll see "Waiting for display approval…".

### Back on the Display screen

4. A "Pairing Requests" card should now show your controller's name with
   **Approve** / **Reject** buttons. Click **Approve**.

### Back on the Controller screen

5. Within a couple seconds it should say "Paired successfully" — click
   **Done**.
6. Click the paired display's name to select it as the target.
7. Type a plate under "Send Single Plate" and click **Send Plate**.
8. Switch back to the Display screen — the car should be running with that
   plate, driven entirely from the Controller screen.
9. Try the **Pause** / **Resume** / **Stop** / **Skip** / **Open Gate**
   buttons on the Controller screen and confirm they affect the Display screen.

### Revoking access

10. On the Display screen, find your controller under "Paired Controllers"
    and click **Revoke**. Any further commands from that controller should
    now fail (if you're curious, the Controller screen's next "Send" attempt
    will show an error).

## 8. Camera Mode

1. On the Display screen, click **Camera Mode** (bottom of the right-hand panel).
   The whole app shell (nav sidebar, header, panel) disappears, showing just
   the simulation full-screen.
2. From the Controller screen, send another plate — the car should still run
   on the Display screen even though its control panel is hidden.
3. Press **Escape** or click the small **EXIT** button (top-right) to leave
   Camera Mode.

## 9. Docker (optional, for release verification)

If you have Docker installed:

```bash
docker compose up --build
```

Wait for both services to report "started", then open
`http://localhost:8080` (the web app, served by Docker) and repeat a few of
the steps above pointing the Local API / Remote Mode panels at
`http://localhost:8787` (already the default).

To stop: `docker compose down` (add `-v` only if you want to also delete
all saved data).

## 10. Real LAN Testing: Two Computers

Everything in section 7 above used two browser *tabs* on one machine. This
section is the real version: two separate computers on the same Wi-Fi/LAN,
one acting as the Display, the other as the Controller. Backend can run
either directly (`pnpm dev:server`) or via Docker on whichever computer you
pick to host it — "Computer A" below.

### 1. On Computer A — start the backend

1. **Find Computer A's local IP address**:
   - macOS: `ipconfig getifaddr en0` (or check System Settings → Wi-Fi → Details)
   - Windows: `ipconfig` → look for "IPv4 Address" under your active adapter
   - Linux: `ip addr show` or `hostname -I`

   It'll look like `192.168.1.50` or `10.0.0.23`. Write it down.

2. **Start the backend**, telling it to also accept the browser origins
   you'll open on Computer B (replace `192.168.1.50` with Computer A's own
   IP from step 1 — the frontend on Computer A will be opened using that
   same IP from Computer B's point of view):

   ```bash
   PLATE_RUNNER_CORS_ORIGINS=http://localhost:5173,http://192.168.1.50:5173 pnpm dev
   ```

   Or with Docker (`.env` file or inline):

   ```bash
   PLATE_RUNNER_CORS_ORIGINS=http://localhost:5173,http://localhost:8080,http://192.168.1.50:5173,http://192.168.1.50:8080 \
     docker compose up --build
   ```

3. Watch the backend's startup log — it prints its own detected LAN
   address, e.g. `also reachable from other devices on this network at:
   http://192.168.1.50:8787`. Confirm this matches what you found in step 1.

4. **Confirm `/health` responds locally first**, before involving a second
   machine at all:
   ```bash
   curl http://192.168.1.50:8787/health
   ```
   (Not `localhost` — use the actual LAN IP, to prove it's reachable the
   same way Computer B will reach it.)

5. If you're running the frontend via `pnpm dev`/`pnpm dev:web` (not Docker),
   check its own startup output too — Vite should print a `Network:` line:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.50:5173/
   ```
   If you only see the `Local:` line and a hint saying `use --host to
   expose`, the frontend dev server itself isn't reachable from Computer B
   yet — this is a distinct issue from the backend being LAN-reachable, and
   would block Computer B from even loading the page. (Already fixed in
   `apps/web/vite.config.ts` for this repo — this note is here so it's
   obvious what a regression of that fix would look like.)

### 2. On Computer B — connect to Computer A

1. Open a browser to Computer A's frontend: `http://192.168.1.50:5173`
   (`pnpm dev`) or `http://192.168.1.50:8080` (Docker). Computer B does
   **not** need its own copy of the code running — it's just a browser
   pointed at Computer A's frontend.
2. In whichever panel you'll use (Local API / Display Mode / Controller
   Mode), set **API Base URL** to `http://192.168.1.50:8787` — Computer A's
   IP and backend port, not `localhost` (from Computer B, `localhost` means
   Computer B itself, which has nothing listening on 8787).
3. Click **Test Connection** — it should say `connected`. If it doesn't,
   see Troubleshooting below before going further.

### 3. Display flow (pick either computer)

You can run Display Mode on Computer A (alongside the backend) or Computer
B — it just needs a browser pointed at *a* frontend and an API Base URL
pointed at Computer A's backend. For this walkthrough, Display runs on
Computer A:

1. On Computer A, open `http://localhost:5173` (or `:8080` local, since
   it's the same machine as the backend) → open the **Display** screen.
2. Register the display, generate a pairing code, click **Listen for
   Remote Commands**.

### 4. Controller flow (the other computer)

1. On Computer B, open the **Controller** screen from the sidebar (already pointed at
   Computer A's backend from step 2 above).
2. Enter the controller name and the 6-digit code shown on Computer A.
3. Wait for "Waiting for display approval…".
4. On Computer A's Display screen, **Approve** the incoming request.
5. Computer B's Controller screen should show "Paired successfully" within a
   couple seconds.
6. From Computer B, test each action against Computer A's Display:
   - Send a single plate → confirm the car runs on Computer A's screen.
   - Send a queue (a few comma/newline-separated plates).
   - Pause, then Resume.
   - Open Gate (if the plate's gate mode is `wait_for_signal`).
   - Stop.

Every one of these is a real network round-trip between two physical
machines — this is the scenario Remote Mode is actually built for.

### 5. Camera Mode across the network

1. On Computer A (Display), click **Camera Mode** — the control panel
   disappears, full-screen simulation only.
2. From Computer B (Controller), send another plate.
3. Confirm it still runs on Computer A's screen — the listener keeps
   polling even with no visible UI, and this now proves it over a real
   network, not just within one browser process.
4. Exit Camera Mode on Computer A (Escape or the small EXIT button).

### 6. Restart test

1. Stop and restart the backend on Computer A (`Ctrl+C` then `pnpm
   dev:server` again, or `docker compose restart plate-runner-server`).
2. On Computer A's Display screen, confirm the registered display and its
   paired controller are still listed (may need a page refresh + clicking
   "↻ refresh" under Paired Controllers).
3. From Computer B's Controller screen — **without re-pairing** — send another
   command (e.g. Pause). It should still work: the `controllerToken` is
   stored in Computer B's browser `localStorage` from the original pairing,
   and the backend's SQLite data (including that pairing) survived the
   restart. If Computer B's token had been revoked or the backend's data
   directory was wiped, this step would correctly fail with `401` instead.

### 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Computer B can't even load the page (not a Test Connection issue — the page itself never appears) | Frontend dev server (Vite) isn't bound to the LAN — only relevant if running `pnpm dev`/`pnpm dev:web` directly, not Docker (nginx in the Docker image already listens on all interfaces) | Check Computer A's Vite output for a `Network:` line; if it's missing, confirm `apps/web/vite.config.ts` still has `server: { host: true }` |
| Test Connection fails / times out | Wrong IP, or Computer A's firewall is blocking the port | Re-check the IP with `ipconfig`/`ip addr`; on macOS, System Settings → Network → Firewall may need to allow incoming connections for `node`; on Windows, allow the port through Windows Defender Firewall |
| Test Connection gets a response but pairing/data never updates, browser console shows a CORS error, or — **on iOS Safari specifically — any action fails with the generic message "Load failed"** (Safari's wording for any failed `fetch()`, including CORS rejections; it does not say "CORS" anywhere) | Computer B's browser origin isn't in `PLATE_RUNNER_CORS_ORIGINS` | Restart the backend with Computer B's actual origin added (see step 1.2) — CORS errors are silent in the UI but visible in the browser DevTools Console/Network tab. To confirm without DevTools, simulate the browser's preflight from any machine on the network: `curl -i -X OPTIONS http://<server-ip>:8787/api/controllers/pair -H "Origin: http://<computer-B-origin>" -H "Access-Control-Request-Method: POST"` — a disallowed origin gets `404` (no CORS headers, falls through to routing), an allowed one gets `204` with an `access-control-allow-origin` header |
| `401 unauthorized` on every request | API key mismatch, or you forgot to pass `x-api-key` somewhere custom | Confirm both machines are using the same `PLATE_RUNNER_API_KEY` value (defaults to `dev-local-key` if unset — fine for LAN testing, just make sure it's the *same* default on both ends, i.e. don't set it on one machine and not the other) |
| Server appears to start but `curl` from Computer B hangs or refuses | Server bound only to `localhost` | Shouldn't happen — this codebase always binds `0.0.0.0` — but confirm you didn't run the server through an SSH tunnel or port-forward that only maps loopback |
| Port already in use on startup | Another process (maybe a previous test run) still holds port 8787/5173/8080 | `lsof -i :8787` (macOS/Linux) or `netstat -ano \| findstr 8787` (Windows) to find and stop it |
| Docker: Computer B can't reach the server at all | Docker isn't publishing the port to the host's real network interface | Confirm `docker compose ps` shows `0.0.0.0:8787->8787/tcp` (not `127.0.0.1:8787->...`) — this repo's `docker-compose.yml` already publishes this way by default, so this would indicate a locally modified compose file |
| Browser shows a generic "can't connect" / "site can't be reached" | Wrong protocol/IP/port typo, or the two computers aren't actually on the same network (e.g. one is on a guest Wi-Fi network isolated from the other) | Double-check the exact URL; confirm both computers can `ping` each other's IP first, before involving the app at all |

## 11. What "broken" looks like

Stop and report an issue if you see any of:

- The browser's developer console (F12 → Console tab) showing red error
  messages during any of the steps above.
- A button that does nothing when clicked (no visual change, no error).
- A plate ever displayed with HTML-looking content instead of plain text
  (e.g. if you typed `<script>` somewhere and it visually "does" something
  other than being rejected as an invalid plate).
- The app becoming permanently stuck with a red error banner and no
  working "Reset Storage" / "Clear" button to recover.
- Any API key, token, or pairing code appearing in the terminal output
  where the server is running.

## 12. System Status, Storage Management, and Backup

1. Open **Settings / API**, scroll to **System Status** — confirm it
   shows app name, frontend mode, API base URL/status, display
   registered, pairings/lists/schedules/history counts, queue status,
   vehicle color, last screen, browser storage available, and Screen
   Saver enabled/timeout. Confirm the API key is **not** shown anywhere.
2. Click **Check Backend Status** (backend must be running) — shows
   backend health, storage type/ok, pending commands, server time.
3. Click **Export Backup** — downloads a JSON file. Open it and confirm
   it has `schemaVersion`, `type: "plate_runner_local_backup"`, and a
   `data` object with `plateLists`/`schedules`/`executionHistory`/
   `preferences`/`screenSaver` — and confirms it does **not** contain
   `apiKey`, `controllerToken`, or `displaySecret` anywhere.
4. Under **Local Storage**, try each **Reset** button — each should show
   a confirm dialog first. Cancel a couple to confirm nothing happens if
   you decline. Confirm "Reset App Preferences" returns you to Home, and
   "Reset Screen Saver Settings" restores the 10-minute default.
5. Try **Import Backup** with the file you exported in step 3 — confirm
   it warns about overwriting, then reloads with the same data restored.

## 13. Screen Saver

1. Go to **Settings / API → Screen Saver**, set the timeout to the
   lowest custom value (1 minute), pick a style.
2. Reload the page — confirm the timeout/style you picked are still
   selected.
3. Go to Local Mode and don't touch anything for about a minute — the
   full-screen overlay should appear, no sidebar/header visible.
4. Move the mouse (or press a key, or touch on a touchscreen) — it
   should close immediately.
5. Start the vehicle with **Wait Signal** gate mode and let it sit at
   `waiting_for_signal` — confirm the Screen Saver does **not** appear
   even after the timeout elapses while it's waiting.
6. With the Local API listener enabled (see section 6) and the Screen
   Saver active, send a plate via `curl -X POST /api/simulate` — the
   overlay should close automatically and the plate should update
   correctly.

## 14. Where to look for more detail

- [RELEASE_CANDIDATE_QA.md](RELEASE_CANDIDATE_QA.md) — full QA results and known limitations.
- [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md) / [API_COMMANDS_SPEC.md](API_COMMANDS_SPEC.md) — every backend endpoint.
- [PAIRING_SPEC.md](PAIRING_SPEC.md) / [REMOTE_MODE_SPEC.md](REMOTE_MODE_SPEC.md) — how Remote Mode pairing works under the hood.
- [SECURITY_NOTES.md](SECURITY_NOTES.md) — what's protected and what's explicitly deferred.
- [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) — running, configuring, and maintaining the app day-to-day.
- [SCREEN_SAVER_SPEC.md](SCREEN_SAVER_SPEC.md) — full Screen Saver behavior spec.
- [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md) — a 10–15 minute guided demo script.
