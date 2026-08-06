# Security Notes — Local Backend (Macro Phase 4 + Macro Phase 5 + Macro Phase 5.1)

Implementation-level notes for the local backend and Remote Mode. The
broader, longer-lived policy document is
[SECURITY_SPEC.md](SECURITY_SPEC.md) — §4 of that document described the
target state for "Future API Security"; this note records what was actually
implemented against it and what's explicitly deferred. Pairing-specific
detail (token hashing, revocation, code expiry) lives in
[PAIRING_SPEC.md](PAIRING_SPEC.md) — this document only summarizes it.

> **Updated by the Security Hardening + Railway Readiness phase.** The
> "Local-only assumption" section below explicitly called for a re-audit
> once exposure beyond a trusted LAN was on the table — that's this phase.
> See [SECURITY_AUDIT_RAILWAY_READINESS.md](SECURITY_AUDIT_RAILWAY_READINESS.md)
> for the current, authoritative audit (assets/trust boundaries/known
> risks/READY decision) and [RAILWAY_DEPLOYMENT_PLAN.md](RAILWAY_DEPLOYMENT_PLAN.md)
> for deployment prep. The sections below are updated in place rather than
> superseded wholesale, since most of the underlying mechanisms are unchanged.

## API key handling

- Read from `PLATE_RUNNER_API_KEY`. In development (`PLATE_RUNNER_ENV`
  unset or not `production`), an unset key still falls back to
  `dev-local-key` with a `console.warn` — unchanged, still fine for local
  dev. **In production (`PLATE_RUNNER_ENV=production`), this is now a hard
  startup failure, not a warning**: a missing key, a key equal to
  `dev-local-key`, or a key under 32 characters all abort startup
  (`process.exit(1)`) before the server ever listens. `NODE_ENV` is no
  longer consulted for this decision — only `PLATE_RUNNER_ENV`, so the
  Docker image's unconditional `NODE_ENV=production` (an unrelated Node
  runtime setting) doesn't accidentally trigger production enforcement
  during local `docker compose up`.
- Compared via `crypto.timingSafeEqual` (previously `===`).
- Checked via `x-api-key` header or `Authorization: Bearer <key>` on every
  `/api/*` route; `/health` is intentionally exempt (needs to be pollable
  without a key for basic liveness checks).
- Never logged: the Fastify logger's `req` serializer only ever emits
  `{method, url, hostname, remoteAddress}` — headers (and therefore the key)
  structurally cannot reach a log line, regardless of what a future route
  handler does.
- Never stored server-side beyond the env var/process memory — no key
  hashing/rotation endpoint (rotation means restarting the process with a
  new env var).
- On the frontend, the key lives in React state and is only ever attached
  as a request header — never logged to the console, never rendered into
  the DOM.

## Display secrets and controller tokens (Phase 5)

- Both are 32 random bytes (`crypto.randomBytes(32)`, 256 bits) — see
  [PAIRING_SPEC.md](PAIRING_SPEC.md) for the full generation/hashing/
  revocation design.
- **Neither is ever stored in plaintext.** Only their SHA-256 hash is
  persisted (`display_devices.secretHash`, `device_pairings.tokenHash`) —
  this goes further than the original spec's "preferable, document if not"
  framing for `displaySecret`; both credentials get the same treatment.
- The plaintext value is returned in exactly one API response (at
  registration / at pairing time) and never again.
- Never logged — the same header-only-fields `req` serializer that protects
  the API key also protects `x-display-secret` and `x-controller-token`
  (neither is a field the serializer ever includes).
- 6-digit pairing codes are generated with `crypto.randomInt`, expire after
  5 minutes, and are never treated as a credential — see PAIRING_SPEC.md.
- **Phase 5.1**: token minting is deferred to an explicit `finalize` step,
  only reachable after the Display owner approves the request — a
  controller can no longer obtain a token unilaterally just by knowing a
  valid code. `finalize` is also structurally one-time: a second call sees
  `status === 'used'` and 409s with `token_already_issued`.

## Validation

- Every plate/enum/config value accepted by the backend goes through the
  same `@plate-runner/shared` validators the frontend uses — no duplicate,
  weaker validation path exists on the server.
- Display/controller names are capped at 80 characters (`validateName`,
  reusing the same limit `MAX_PLATE_LIST_NAME_LENGTH` already used).
- Plate text is never rendered as HTML anywhere in this stack (unchanged
  from SECURITY_SPEC.md §2/§3 — the backend only stores/forwards plate
  strings as JSON values, never interpolates them into markup).

## Rate limiting

- General: `@fastify/rate-limit`, per IP, applied to the whole `/api/*`
  scope. Default 100/min, configurable via
  `PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN` (added in the Security
  Hardening phase — previously hardcoded).
- **Pairing**: `POST /api/controllers/pair`, `POST
  /api/displays/:id/pairing-code`, and `POST /api/displays/register` are
  limited tighter than the general limit — default 10/min, configurable
  via `PLATE_RUNNER_RATE_LIMIT_PAIRING_PER_MIN` (display registration was
  added to this tier during the Security Hardening phase; it previously
  only had the general 100/min limit).
- **Remote commands**: every `/api/remote/displays/:displayId/*` route —
  default 30/min, configurable via
  `PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN`.
- Still per-IP, still basic — SECURITY_SPEC.md §4.4's per-API-key/per-
  pairing tiers are a further-future refinement, not implemented.
- Also new this phase: a max of 5 concurrent `approval_pending` requests
  per display (`too_many_pending_requests`, 409) — stops a leaked/shared
  pairing code from generating unbounded pending approvals.
- **Failed-attempt guard (Phase 5.1)**: on top of the 10/min route limit,
  an in-memory sliding-window tracker
  (`security/failedPairingAttempts.ts`) blocks an IP with `429
  too_many_failed_attempts` after 5 failed `POST /api/controllers/pair`
  attempts within 5 minutes (bad format, unknown code, expired code all
  count). Resets on server restart — acceptable for local/LAN, not a
  production-grade defense.

## CORS

**Resolved in Phase 5** — `origin: true` was replaced with a
`PLATE_RUNNER_CORS_ORIGINS` allowlist (comma-separated origins). Unset
falls back to `http://localhost:5173,http://localhost:8080` with a
`console.warn` (louder under `NODE_ENV=production`), the same
loud-default pattern already used for `PLATE_RUNNER_API_KEY`. A disallowed
origin gets no CORS headers rather than an explicit server-side rejection —
CORS is a browser-enforced policy, so omitting the headers is what actually
blocks a real cross-origin browser request; the underlying request from a
non-browser client (curl, a script) still completes, which is expected and
harmless since it still needs a valid API key regardless.

## Payload limits

**Resolved in Phase 5, made configurable in the Security Hardening
phase** — Fastify's `bodyLimit` defaults to 1MB globally
(`PLATE_RUNNER_BODY_LIMIT_BYTES`, was hardcoded), rejecting oversized
request bodies with `413` before they reach any route handler.
SECURITY_SPEC.md §4.3's more granular per-endpoint-type limits (4KB for a
single plate run, 64KB for a list upload) are still not separately
enforced — the flat cap is coarser but closes the "unbounded body" gap
that existed before.

## HTTP security headers

**Added in the Security Hardening phase** — `@fastify/helmet` on the
backend (mostly-default protections; a JSON API has no meaningful CSP
need, so CSP is left at helmet's default no-op) and a new
`apps/web/nginx.conf` on the frontend container (`X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and a
pragmatic CSP with `connect-src *` — the API Base URL is user-configurable
at runtime, so a locked-down `connect-src` would break that by design).
No nginx config existed before this phase; the web container shipped
nginx's stock defaults with zero custom headers.

## What's still explicitly out of scope

- Multi-tenant/cloud auth, user accounts — no Remote Mode phase touches
  this; pairing remains device-to-device, not user-to-user.
- HTTPS/TLS termination — assumed to be handled by the platform (Railway
  terminates TLS automatically for its generated/custom domains) or a
  reverse proxy in any other deployment; not configured in this app.
- API key hashing/rotation tooling (the key itself, not display/controller
  credentials — those are already hashed, see above). Production now at
  least *requires* a strong key (see API key handling above); rotating it
  is still "restart with a new env var," unchanged.
- Per-endpoint-type payload size tiers (SECURITY_SPEC.md §4.3) — only a
  flat, now-configurable global cap exists.
- Display secret revocation/expiry — controller tokens gained an optional
  TTL this phase (`PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS`); display secrets
  did not get an equivalent. Flagged as a Medium risk in
  SECURITY_AUDIT_RAILWAY_READINESS.md.
- A controller cannot self-cancel a pairing request it created, or
  self-inspect/self-revoke its own pairing — those actions are
  display-secret-authenticated only. See PAIRING_SPEC.md's Known
  Limitations.

**Resolved this phase** (was listed as out of scope in Phase 5): manual
Display-side pairing confirmation — pairing no longer auto-approves on a
valid code; see [PAIRING_SPEC.md](PAIRING_SPEC.md) for the full
request/approve/finalize flow.

## Local-only assumption

Every relaxation that remains (flat per-IP rate limiting rather than
per-key/per-pairing tiers, a single global payload cap rather than
per-endpoint tiers, key rotation = process restart) is safe specifically
because this server is designed to run on `localhost`/a trusted LAN, next
to the browser tab(s) that talk to it — Display and Controller devices are
still assumed to be on the same trusted network, not the open internet.
None of it should be treated as "good enough" once a future phase
introduces exposure beyond that trust boundary (a real Remote Mode with
internet-facing displays, cloud relay, etc.) — re-audit this document at
that point.
