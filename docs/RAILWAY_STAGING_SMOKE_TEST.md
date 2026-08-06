# Railway Staging Smoke Test

A step-by-step script for validating a real Railway Staging deployment
of Plate Runner. Run this **after** following
[RAILWAY_DEPLOYMENT_PLAN.md](RAILWAY_DEPLOYMENT_PLAN.md) and completing
[RAILWAY_SECURITY_CHECKLIST.md](RAILWAY_SECURITY_CHECKLIST.md).

This document is a script, not a record — it contains no real URLs,
keys, or secrets. Replace every `<placeholder>` with your actual staging
values as you go, and fill in the Result column yourself (pass/fail +
notes) during the run.

Two browsers/devices are needed for steps 13–14 (pairing) — e.g. a
laptop and a phone, or two browser profiles, both able to reach the
public staging URLs.

## Placeholders used below

| Placeholder | What it is |
|---|---|
| `<server-staging-url>` | `plate-runner-server`'s public Railway URL, e.g. `https://plate-runner-server-staging.up.railway.app` |
| `<web-staging-url>` | `plate-runner-web`'s public Railway URL |
| `<generated-api-key>` | The strong API key generated per §F of the deployment plan, set only in Railway's Variables tab |

## Steps

1. **Deploy `plate-runner-server`.** In Railway, create the service from
   `apps/server/Dockerfile` (root directory: repo root, per
   `RAILWAY_DEPLOYMENT_PLAN.md`'s Services section). *Expect:* build
   succeeds, service starts, Railway shows it healthy.

2. **Attach a Railway Volume to `plate-runner-server`, mounted at
   `/data`.** *Expect:* volume shows as attached in the service's
   Settings → Volumes tab.

3. **Set the server's environment variables** per
   `RAILWAY_DEPLOYMENT_PLAN.md`'s Environment Variables section
   (`PLATE_RUNNER_ENV=production`, `PLATE_RUNNER_API_KEY=<generated-api-key>`,
   `PLATE_RUNNER_CORS_ORIGINS` — leave at a placeholder for now, revisited
   in step 7 — `PLATE_RUNNER_STORAGE_PATH=/data`, plus the optional TTL
   and rate-limit vars). Do **not** set `PORT` yourself. Redeploy.
   *Expect:* service restarts cleanly; if `PLATE_RUNNER_API_KEY` is
   missing/short or `PLATE_RUNNER_CORS_ORIGINS` is missing, the service
   should fail to start with a clear `ConfigError` message in the logs
   (see `apps/server/src/config.ts`) — confirms the production guard
   rails are live, not just documented.

4. **Open `<server-staging-url>/health`.** *Expect:*
   `{"ok":true,"service":"plate-runner-server","version":"...","time":"..."}`,
   no auth required.

5. **Confirm `/api/status` requires the API key.** `curl
   <server-staging-url>/api/status` with no header → expect `401`. Then
   `curl -H "x-api-key: <generated-api-key>" <server-staging-url>/api/status`
   → expect `200` with a status payload.

6. **Deploy `plate-runner-web`.** Create the service from
   `apps/web/Dockerfile`. *Expect:* build succeeds (Vite build + nginx
   stage), service healthy, `<web-staging-url>` serves the app shell.

7. **Set `PLATE_RUNNER_CORS_ORIGINS` on the server to `<web-staging-url>`**
   (exact scheme + host, no trailing slash; comma-separate if also
   testing a custom domain). Redeploy the server — CORS origins are read
   once at startup, not hot-reloaded.

8. **Open `<web-staging-url>` in a browser.** *Expect:* the app loads,
   lands on Home, no console errors from a blocked stylesheet/script
   (the existing CSP is same-origin for scripts/styles).

9. **Configure API Base URL.** Go to Settings / API (or Display Mode's
   registration form), set API Base URL to `<server-staging-url>` and
   API Key to `<generated-api-key>`.

10. **Test Connection** (Settings / API's connection check, or simply
    proceed to step 11 — registering a display exercises the same
    path). *Expect:* connected/API reachable, no CORS error in the
    browser console.

11. **Register a Display** (Display Mode → Register This Display, any
    name). *Expect:* registration succeeds, "Display Security" section
    appears showing `secret: active` and "No expiration configured"
    (or a real date if `PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS` is set).

12. **Generate a Pairing Code** from the registered Display. *Expect:* a
    6-digit code with a countdown.

13. **Open Controller Mode on a second browser/device**, pointed at the
    same `<server-staging-url>` + `<generated-api-key>`, and enter the
    pairing code. *Expect:* request goes to `approval_pending`.

14. **Approve the pairing request** from the Display's "Pairing
    Requests" list. *Expect:* the Controller finalizes and shows itself
    as paired; the Display's "Paired Controllers" list shows it.

15. **Send a single remote plate** from the Controller. *Expect:* the
    Display renders the simulation run.

16. **Send a remote queue** (multiple plates) from the Controller.
    *Expect:* the Display plays through the queue in order.

17. **Test Pause / Resume / Stop / Open Gate** from the Controller
    during a run. *Expect:* each command visibly affects the Display's
    simulation state in near-real-time (Display polls every 1.5s).

18. **Rotate the Display's secret** (Display Mode → Display Security →
    Rotate Secret, confirm the dialog). *Expect:* success, a new secret
    is saved locally, the Display keeps polling without interruption
    (the hook only swaps the stored secret on success).

19. **Revoke the Display OR revoke the paired Controller** (pick one —
    both are exercised in the Display Secret Lifecycle QA already, this
    just confirms it over the real network): revoking the Display
    should return it to "not registered" locally and immediately reject
    the still-paired Controller's next command (401 `unauthorized`, per
    the cascade documented in `PAIRING_SPEC.md`); revoking a pairing
    from the "Paired Controllers" list should reject just that
    Controller while the Display stays registered.

20. **Restart the `plate-runner-server` service** from Railway's
    dashboard (not a redeploy — a restart, to specifically test the
    Volume, not a fresh image). *Expect:* service comes back up.

21. **Confirm pairings/displays persisted through the restart.** Re-open
    the Display or Controller UI (or `GET /api/displays/:displayId`
    with the API key) — the same `displayId`, name, and any surviving
    pairings should still be there. *Expect:* no data loss — this is
    the Volume doing its job.

22. **Check server logs for secrets.** In Railway's log viewer, search
    for the plaintext `displaySecret` and `controllerToken` values used
    in this run. *Expect:* zero matches — the service must never log
    either value (see `SECURITY_NOTES.md`'s Display Secret Lifecycle
    section).

23. **Export a local backup from the web UI** (Settings / API → Local
    Backup → Export Backup) and open the downloaded JSON file.
    *Expect:* it contains Plate Lists, Scheduler, Execution History, and
    Screen Saver settings — no API key, no display secret, no controller
    token (backups are local/non-secret by design, see `BackupPanel.tsx`).

24. **Confirm the Screen Saver still activates** after the configured
    idle period (Settings / API → Screen Saver, temporarily lower the
    timeout for the test if needed). *Expect:* the overlay appears and
    dismisses on activity, matching `SCREEN_SAVER_SPEC.md`.

25. **Confirm CORS rejects an unknown origin (best-effort).** From a
    third origin (e.g. a `file://` HTML page or a `fetch()` from
    `<web-staging-url>.evil.example` if you control one — or simply
    open the browser devtools Network tab against a *different*
    deployed origin than the one in `PLATE_RUNNER_CORS_ORIGINS`) and
    attempt a request. *Expect:* the browser blocks the response
    client-side (no `Access-Control-Allow-Origin` header echoed back).
    Note: a plain `curl` with no `Origin` header will **not** be
    rejected — the server intentionally allows non-browser callers
    through and relies on the API key there (documented in `index.ts`'s
    CORS setup comment) — so this check must be done from a real
    browser context, not curl.

## After the smoke test

- Record pass/fail for each step somewhere durable (this file is a
  script, not a log — copy it or note results in your deployment
  tracking of choice).
- If everything passes, the staging deployment is validated end-to-end.
  This does **not** change the release decision to
  `READY_FOR_RAILWAY_PRODUCTION` — that requires its own review (see
  `SECURITY_AUDIT_RAILWAY_READINESS.md`'s residual Medium/Low risks).
