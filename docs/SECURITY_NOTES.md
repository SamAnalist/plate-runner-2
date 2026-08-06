# Security Notes — Local Backend (Macro Phase 4 + Macro Phase 5 + Macro Phase 5.1)

Implementation-level notes for the local backend and Remote Mode. The
broader, longer-lived policy document is
[SECURITY_SPEC.md](SECURITY_SPEC.md) — §4 of that document described the
target state for "Future API Security"; this note records what was actually
implemented against it and what's explicitly deferred. Pairing-specific
detail (token hashing, revocation, code expiry) lives in
[PAIRING_SPEC.md](PAIRING_SPEC.md) — this document only summarizes it.

## API key handling

- Read from `PLATE_RUNNER_API_KEY`. If unset, falls back to `dev-local-key`
  with a `console.warn` on startup (louder wording under
  `NODE_ENV=production`) — a deliberately loud default, not a silent one.
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

- General: `@fastify/rate-limit`, 100 requests/minute per IP, applied to
  the whole `/api/*` scope.
- **Pairing** (Phase 5): `POST /api/controllers/pair` and `POST
  /api/displays/:id/pairing-code` are limited to 10 requests/minute per
  route — tighter than the general limit, since pairing-code guessing is
  the one place a rate limit is load-bearing for actual security (a 6-digit
  space is only 1,000,000 possibilities).
- **Remote commands** (Phase 5): every `/api/remote/displays/:displayId/*`
  route is limited to 30 requests/minute — stricter than general API
  traffic since remote command creation is a more consequential action than
  local status polling.
- Still per-IP, still basic — SECURITY_SPEC.md §4.4's per-API-key/per-
  pairing tiers are a further-future refinement, not implemented.
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

**Resolved in Phase 5** — Fastify's `bodyLimit` is set to 1MB globally
(`Fastify({ bodyLimit: 1_000_000 })`), rejecting oversized request bodies
with `413` before they reach any route handler. SECURITY_SPEC.md §4.3's
more granular per-endpoint-type limits (4KB for a single plate run, 64KB
for a list upload) are still not separately enforced — the flat 1MB cap is
coarser but closes the "unbounded body" gap that existed before.

## What's still explicitly out of scope

- Multi-tenant/cloud auth, user accounts — no Remote Mode phase touches
  this; pairing remains device-to-device, not user-to-user.
- HTTPS/TLS termination — assumed to be handled by a reverse proxy in any
  deployment that needs it; not configured here.
- API key hashing/rotation tooling (the key itself, not display/controller
  credentials — those are already hashed, see above).
- Per-endpoint-type payload size tiers (SECURITY_SPEC.md §4.3) — only a
  flat global cap exists.
- Pairing brute-force protection beyond the rate limit + failed-attempt
  counter — no lockout/backoff scheme, and the counter is in-memory only.
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
