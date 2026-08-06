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

You should see the Plate Runner interface: a dark screen with a road/gate
scene on the left and a control panel on the right, with three tabs at the
top: **Local**, **Display**, **Controller**.

## 2. Local Mode — the basics

Local Mode (the default tab) is one computer showing and controlling its
own simulation.

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

## 3. Plate Queue — running many plates in a row

1. Open the **Plate Queue** section in the sidebar.
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

1. Open **Plate Lists**, click **+ New List**.
2. Give it a name, paste a few plates, pick a direction/color/gate, click
   **Save List**.
3. On the saved list card, try **Run List** (starts playing immediately),
   **Load Into Queue** (fills the queue but doesn't start it), **Edit**,
   **Duplicate**, and **Delete**.
4. Click **Export All**, then **Import JSON** and pick the file you just
   downloaded — it should re-import without duplicating incorrectly.
5. Reload the page — your saved lists should still be there.

## 5. Scheduler — automatic timed runs

1. Create a Plate List first (see above) if you haven't.
2. Open **Scheduler**, click **+ New Schedule**.
3. Pick a Plate List, set **Run Mode** to **Repeat interval**, set it to
   `10` seconds, and enable **Max Runs** at `2`.
4. Save it and watch — it should fire automatically after ~10 seconds, then
   again ~10 seconds later, then show status **disabled** (it stops itself
   after reaching Max Runs).
5. Try **Run Now** on any schedule — it runs immediately, but does NOT
   count against that schedule's run counter (this is intentional).
6. Check **Execution History** — you should see a record for each run.

## 6. Local API — controlling the app from a script

This lets an external script drive the simulation via the local backend
(same computer, different process).

1. Open **Local API**, click **Test Connection** — it should say
   `connected`.
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

### On the "Display" tab

1. Open a new tab to `http://localhost:5173`, click the **Display** tab.
2. Under **Register This Display**, type a name (e.g. "Front Gate") and
   click **Register Display**.
3. Click **Generate Pairing Code** — a large 6-digit code appears with a
   5-minute countdown.
4. Click **Listen for Remote Commands**.
5. Keep this tab open and visible.

### On the "Controller" tab

1. Go back to your first tab, click the **Controller** tab.
2. Type a controller name (e.g. "My Laptop") and the 6-digit code from the
   Display tab, click **Pair**.
3. You'll see "Waiting for display approval…".

### Back on the Display tab

4. A "Pairing Requests" card should now show your controller's name with
   **Approve** / **Reject** buttons. Click **Approve**.

### Back on the Controller tab

5. Within a couple seconds it should say "Paired successfully" — click
   **Done**.
6. Click the paired display's name to select it as the target.
7. Type a plate under "Send Single Plate" and click **Send Plate**.
8. Switch back to the Display tab — the car should be running with that
   plate, driven entirely from the Controller tab.
9. Try the **Pause** / **Resume** / **Stop** / **Skip** / **Open Gate**
   buttons on the Controller tab and confirm they affect the Display tab.

### Revoking access

10. On the Display tab, find your controller under "Paired Controllers"
    and click **Revoke**. Any further commands from that controller should
    now fail (if you're curious, the Controller tab's next "Send" attempt
    will show an error).

## 8. Camera Mode

1. On the Display tab, click **Camera Mode** (bottom of the sidebar). The
   whole sidebar disappears, showing just the simulation full-screen.
2. From the Controller tab, send another plate — the car should still run
   on the Display tab even though its control panel is hidden.
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

## 10. What "broken" looks like

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

## 11. Where to look for more detail

- [RELEASE_CANDIDATE_QA.md](RELEASE_CANDIDATE_QA.md) — full QA results and known limitations.
- [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md) / [API_COMMANDS_SPEC.md](API_COMMANDS_SPEC.md) — every backend endpoint.
- [PAIRING_SPEC.md](PAIRING_SPEC.md) / [REMOTE_MODE_SPEC.md](REMOTE_MODE_SPEC.md) — how Remote Mode pairing works under the hood.
- [SECURITY_NOTES.md](SECURITY_NOTES.md) — what's protected and what's explicitly deferred.
