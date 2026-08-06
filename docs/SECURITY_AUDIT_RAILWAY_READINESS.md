# Security Audit — Railway Readiness

A point-in-time audit of Plate Runner's security posture, done ahead of a
future (not-yet-scheduled) Railway deployment. Covers what was found,
what was hardened in response, and what's deliberately left for later.
This is not a penetration test — it's a code-level review of auth,
secrets, storage, transport, and configuration against the threat model
in the request that triggered this phase (a potentially-public Railway
environment, not just a trusted LAN).

## Current security posture

Plate Runner already had a reasonable foundation before this phase:
API-key-gated backend, hashed secrets/tokens at rest (SHA-256, never
plaintext), crypto-random pairing codes and tokens, an IP-based
failed-pairing-attempt lockout, per-route rate limits on sensitive
endpoints, a CORS allowlist, and a request logger that structurally
excludes headers (so secrets can't leak via routine request logging).
This phase closes the gaps that foundation left — mainly around
*production enforcement* (insecure defaults were only ever warned about,
never blocked) and a few genuinely missing pieces (token TTL, configurable
limits, HTTP security headers, Railway's `PORT` convention).

## Assets protected

- The API key (gates every `/api/*` route).
- Display secrets (`display_devices.secretHash`) — prove "I am this
  specific display."
- Controller tokens (`device_pairings.tokenHash`) — prove "I am a
  controller paired with this specific display."
- Pairing codes (6-digit, 5-minute TTL) — a short-lived bearer credential
  used once to bootstrap a controller↔display pairing.
- The SQLite database itself (plate lists, schedules, execution history,
  display/pairing records — no plaintext secrets stored, see Secrets
  Inventory below).
- Browser `localStorage` on both the Display and Controller sides
  (`displaySecret`, `controllerToken` persist there by necessity, to
  survive reloads).

## Trust boundaries

1. **Browser ↔ Backend** — every `/api/*` request must carry the API
   key. This is the outermost boundary; without it, nothing else matters.
2. **Display ↔ Backend** — a display's own actions (heartbeat, pairing
   code generation, listing/approving/rejecting pairing requests) require
   both the API key *and* that display's `x-display-secret`.
3. **Controller ↔ Backend** — remote-command routes require both the API
   key *and* a valid, non-revoked, non-expired `x-controller-token` scoped
   to the target `:displayId`.
4. **Operator ↔ Deployment config** — env vars are the only way to set
   the API key, CORS origins, storage path, rate limits, and token TTL.
   This audit's "production rules" section is entirely about making this
   boundary fail loudly instead of silently falling back to something
   insecure.

## Auth mechanisms (post-hardening)

| Mechanism | Comparison | Notes |
|---|---|---|
| API key (`x-api-key` / `Bearer`) | `crypto.timingSafeEqual` (was `===`) | Required, min 32 chars, must not be `dev-local-key`, when `PLATE_RUNNER_ENV=production` |
| Display secret (`x-display-secret`) | SHA-256 hash compared via `timingSafeEqual` (was `===`) | Now supports an optional TTL (`PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS`) and explicit revocation, mirroring the controller-token row below |
| Controller token (`x-controller-token`) | SHA-256 hash → indexed DB lookup (already timing-safe by construction — a lookup, not a compare) | Now supports an optional TTL (`PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS`); revoked/expired both 401 |
| Pairing code | Exact-match DB lookup scoped to `status='pending'` | `crypto.randomInt`, 5-min TTL, single-use (can't be reused once claimed) |

## Secrets inventory

| Secret | Where generated | Where stored | Plaintext ever persisted? |
|---|---|---|---|
| `PLATE_RUNNER_API_KEY` | Operator-provided | Env var only | No — never written to disk by this app |
| Display secret | `crypto.randomBytes(32)` | `display_devices.secretHash` (SHA-256) | Only transiently: returned once at registration, then held in the browser's `localStorage` (`platerunner_display_registration`) |
| Controller token | `crypto.randomBytes(32)` | `device_pairings.tokenHash` (SHA-256) | Only transiently: returned once at finalize, then held in the browser's `localStorage` (`platerunner_controller_pairings`) |
| Pairing code | `crypto.randomInt(0, 1_000_000)` | `pairing_sessions.code` — **plaintext**, by design (see Known Risks) | Yes, but only for its 5-minute TTL window |

Never logged, never in System Status, never in a Local Backup export: the
API key, display secrets, controller tokens, pairing codes. Verified by
code review (custom request serializer excludes headers; every service
log call was read; the backup export type only includes plate lists/
schedules/execution history/preferences) and by manual QA (see below).

## Public endpoints

- `GET /health` — unauthenticated by design (standard health-check
  convention; leaks only `{ok, service, version, time}`).

Everything else is under `/api/*` and requires the API key at minimum.

## Protected endpoints

All `/api/*` routes (API key required), with additional layers:

- `/api/displays/:displayId/*` (except `register`) — + display secret.
- `/api/remote/displays/:displayId/*` — + controller token, scoped to
  that `:displayId` (403 if the token belongs to a different display).
- `/api/controllers/pair`, `/api/displays/register`,
  `/api/displays/:id/pairing-code` — API key + tighter rate limit
  (`PLATE_RUNNER_RATE_LIMIT_PAIRING_PER_MIN`, default 10/min);
  `/api/controllers/pair` additionally has the IP-based failed-attempt
  lockout (5 failures / 5 minutes).
- `/api/remote/*` — API key + controller auth + a stricter rate limit
  (`PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN`, default 30/min).
- Everything else — API key + the general rate limit
  (`PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN`, default 100/min).

## Storage locations

- **SQLite** (`plate-runner.sqlite3` at `PLATE_RUNNER_STORAGE_PATH`) —
  displays, pairing sessions, device pairings, plate lists (server-side
  copies used by the `/api/lists` CRUD routes), simulation commands. No
  plaintext secrets (see Secrets Inventory). Persisted via a named Docker
  volume locally; must be a Railway Volume in production (see
  RAILWAY_DEPLOYMENT_PLAN.md).
- **Browser `localStorage`** — Plate Lists, Scheduler, Execution History,
  app preferences, Screen Saver settings (all non-secret), plus
  `displaySecret`/`controllerToken` (secret, necessarily persisted to
  survive reloads — an XSS on either page would compromise that specific
  credential; mitigated by there being zero `dangerouslySetInnerHTML`/
  `innerHTML`/`eval` anywhere in the frontend, confirmed by full-tree grep).

## Known risks

**High**
- None remaining that block a staging-tier Railway deployment (see
  Release Decision). The two candidates that would have been High —
  insecure production defaults, and Railway's `PORT` env being ignored —
  are both fixed this phase.

**Medium**
- ~~Display secrets never expire and have no revocation path~~ —
  **Resolved in the Display Secret Lifecycle Hardening phase.** Display
  secrets now support an optional TTL (`PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS`,
  unset = never expires, matching the original controller-token treatment)
  and an explicit `POST /api/displays/:displayId/revoke` endpoint, which
  also cascades to revoke that display's `device_pairings` and cancel any
  live `pairing_sessions` — see SECURITY_NOTES.md and PAIRING_SPEC.md.
- **No automated test suite** — every change in this project (including
  this phase) is verified by manual/scripted QA, not CI-enforced tests.
  Regressions are possible in future changes without someone re-running
  the manual QA.
- **Single-node SQLite, no automated backups** — fine for a single
  Railway service with a Volume, but there's no scheduled backup/restore
  story beyond the in-app manual "Export Backup" (which only covers
  frontend-visible data, not the server-side SQLite tables).
- **No WAF / DDoS protection beyond in-app rate limiting** — acceptable
  for a staging/demo deployment, worth revisiting before a
  security-sensitive production launch.

**Low**
- `pairing_sessions.code` has no DB-level `UNIQUE` constraint (relies on
  RNG entropy — ~1-in-1M collision chance during any given 5-minute
  window, low real-world risk).
- No `PRAGMA foreign_keys` enforcement between related tables — data
  integrity relies on application logic, not the DB schema.
- ~~The `cancelled` `PairingSessionStatus` value is modeled in the shared
  type but no code path ever sets it~~ — **Resolved in the Display Secret
  Lifecycle Hardening phase.** Revoking a display now cancels any of its
  live pairing sessions, the first real path that sets this status.
- Helmet's default CSP is a no-op for this JSON API (no HTML responses)
  — harmless, just not meaningfully protective either.

## Required fixes before Railway (all implemented this phase)

1. Hard-fail startup in production on a missing/default/short API key.
2. Hard-fail startup in production on missing CORS origins (no silent
   localhost fallback).
3. Respect Railway's injected `PORT` env var (previously ignored —
   would have silently listened on the wrong port on a real deploy).
4. Constant-time comparison for the API key and the one raw secret
   compare that used `===`.
5. Never leak a stack trace in an HTTP response body, in any environment;
   genericize 5xx error messages in production.
6. Configurable, production-appropriate body/rate limits (previously
   hardcoded).
7. HTTP security headers on both the API (`@fastify/helmet`) and the web
   container (new `nginx.conf` — previously shipped zero custom headers).
8. Backup import size/array caps (previously unbounded).
9. Client-side `maxLength` on Controller/Display name fields (server
   already enforced 80 chars; client-side was a gap).
10. Storage-path production warning when relying on the ephemeral-looking
    `./data` default.

## Optional fixes after Railway (deliberately deferred)

- ~~Display secret revocation/expiry~~ — done in the Display Secret
  Lifecycle Hardening phase (see Known Risks above).
- DB-level `UNIQUE`/foreign-key constraints (schema-migration risk on an
  existing SQLite file not currently justified without a concrete
  incident).
- An explicit "cancel this pairing code" endpoint (regenerating a code
  already achieves the same effect today).
- Migrating from SQLite to a managed Postgres if/when multi-instance
  scaling is ever needed (a single Railway service with a Volume doesn't
  need this yet).
- Automated tests (explicitly out of scope for this project's phases so
  far, per standing instructions).

## Final decision

**READY_FOR_RAILWAY_STAGING**

Every identified High risk is fixed. The app is safe to deploy to a
Railway *staging* environment (a real public URL, but not yet handling
sensitive production traffic/data) once the operator follows
`RAILWAY_DEPLOYMENT_PLAN.md`'s pre-deploy checklist — generating a real
API key, setting `PLATE_RUNNER_ENV=production`, `PLATE_RUNNER_CORS_ORIGINS`,
and a Railway Volume for storage.

**Not** marked `READY_FOR_RAILWAY_PRODUCTION` — the remaining Medium risks
above (no automated tests, no automated DB backups, no WAF) are real and
should be either fixed or explicitly accepted by whoever owns the
production launch decision before this handles real user/business-
sensitive traffic. None of them block a staging deploy used for demos or
internal validation. (Display-secret revocation/expiry, previously listed
here, was resolved in the Display Secret Lifecycle Hardening phase.)
