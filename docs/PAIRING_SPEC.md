# Pairing Spec

How a Controller and a Display establish trust, and the security model
behind it. See [REMOTE_MODE_SPEC.md](REMOTE_MODE_SPEC.md) for the broader
picture and [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md) for the endpoint
reference.

**Macro Phase 5.1** changed pairing from auto-approve to manual approval —
a controller claiming a valid code no longer gets a token immediately; the
Display's owner must explicitly approve or reject the request first. This
document describes the current (5.1) flow; the auto-approve version is
gone, but every pairing created under it keeps working unchanged (see
Backward Compatibility below).

## The two credentials

| | 6-digit pairing code | `displaySecret` / `controllerToken` |
|---|---|---|
| Purpose | One-time claim ticket | The actual, long-lived credential |
| Lifetime | 5 minutes (same TTL covers the whole request→approve→finalize flow) | Until revoked, or until an optional TTL expiry passes — `controllerToken` via `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` (since the Security Hardening phase), `displaySecret` via `PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS` (since the Display Secret Lifecycle Hardening phase). Both unset = never expires. |
| Generated with | `crypto.randomInt` | `crypto.randomBytes(32)` (256 bits) |
| Stored server-side as | Plaintext (short-lived, low stakes) | SHA-256 hash only — **never plaintext** |
| Shown to the user | Yes, large on the Display's screen | Once, at finalize time, then never again |

The code is never itself a credential — it only lets a controller *ask* to
be paired. A token is minted only after the Display explicitly approves and
the controller finalizes.

## Pairing session state machine

```
pending → approval_pending → approved → used   (happy path)
                            ↘ rejected           (display says no)
   ↓            ↓              ↓
 expired      expired        expired            (5-minute TTL, any non-terminal state)
```

- **`pending`** — code generated, unclaimed.
- **`approval_pending`** — a controller submitted the code; waiting on the
  Display.
- **`approved`** — Display said yes. **No token exists yet** — see below.
- **`rejected`** — Display said no. Terminal; no token is ever issued for
  this session.
- **`used`** — the controller finalized; token issued. Terminal.
- **`expired`** — the original 5-minute TTL passed while the session was
  in any of `pending`/`approval_pending`/`approved`. Checked lazily on
  every read/write (no background job) — this is what makes an
  `approval_pending` or `approved` request expire on the *same* TTL as the
  code itself, not a separate timer.

Kept `'pending'` rather than renaming it to something like `code_pending` —
that would be a purely cosmetic rename touching every existing comparison
for no behavioral gain.

## Display registration

`POST /api/displays/register` → `{ displayId, displaySecret }`. The secret
is hashed (SHA-256) before being stored in `display_devices.secretHash`; the
plaintext value is returned exactly once and the frontend persists it to
`localStorage` (`platerunner_display_registration`). Every subsequent
display-authenticated request sends it via `x-display-secret` (or
`Authorization: Bearer`).

## Requesting a code (Display side)

`POST /api/displays/:displayId/pairing-code` (display-secret-authenticated)
— unchanged from Phase 5: generates a fresh 6-digit code, `expiresAt = now
+ 5 minutes`, cancels/expires any existing pending code for that display
first (at most one pending code per display), rate-limited to 10/min.

## Creating a pairing request (Controller side)

`POST /api/controllers/pair` with `{ controllerName, code }`:

1. `code` must match `/^\d{6}$/` — otherwise `400`.
2. Looks up a session with that code in `pending` status — `404` if none
   (already claimed, never existed, or the session moved on).
3. If its `expiresAt` has passed, marks it `expired` and returns `410`.
4. Otherwise transitions it to `approval_pending`, stores `controllerName`
   on the session, and returns `{ pairingRequestId, status:
   'approval_pending', displayId, displayName, expiresAt }`. **No token, no
   controller device, nothing sensitive created yet.**

## Display approval

`GET /api/displays/:displayId/pairing-requests` (display-secret-
authenticated) lists that display's `approval_pending` requests as
`{ pairingRequestId, controllerName, createdAt, expiresAt, status }[]`
(expired ones are excluded, lazily resolved on read).

`POST /api/displays/:displayId/pairing-requests/:id/approve` — requires the
request belongs to that display and is currently `approval_pending`
(`404` if wrong display, `410` if expired, `409` if already
approved/rejected/used). Sets `status: 'approved'`.

`POST /api/displays/:displayId/pairing-requests/:id/reject` — same guards,
sets `status: 'rejected'`. No token is ever created for a rejected request.

## Controller polling and finalize

`GET /api/controllers/pairing-requests/:id` — no special auth beyond the
API key (the `pairingRequestId` itself, a UUID, is the only thing needed;
nothing sensitive to protect yet). Returns `{ status, displayId,
displayName }` — **never** a token or `controllerId`, even once approved.
The frontend polls this every 1.5s while `approval_pending`.

`POST /api/controllers/pairing-requests/:id/finalize` — **the only place a
plaintext `controllerToken` is ever produced or returned.** Requires
`status === 'approved'`:

- Creates the `controller_devices` row (using the `controllerName` stored
  on the session back at request-creation time).
- Generates the token, stores only its SHA-256 hash in a new
  `device_pairings` row.
- Sets `status: 'used'`.
- Returns `{ controllerId, displayId, pairingId, controllerToken }`.

A second `finalize` call on the same request sees `status === 'used'` and
`409`s with `token_already_issued` — no extra bookkeeping column needed for
that guard, the status itself is the guard. Calling `finalize` before
`approve` happened (`pending`/`approval_pending`/`rejected`/`expired`)
`409`s with `not_approved`.

**Why token minting is deferred to `finalize`, not done at `approve`
time:** approving only flips a status column — no `controller_devices` or
`device_pairings` row exists yet. A controller that crashes, closes its tab,
or otherwise never calls `finalize` after being approved leaves nothing
behind — no orphaned token, no dangling pairing to later revoke. Finalize
is the one moment that actually commits to creating a working credential.

## Revocation

Unchanged from Phase 5: `POST /api/displays/:displayId/pairings/:pairingId/revoke`
(display-secret-authenticated) sets `revokedAt`. Every subsequent
controller-authenticated request with that token is checked against
`revokedAt` and rejected with `401` immediately — there's no grace period
or cache to invalidate. Verified again this phase against a
finalize-created pairing (not just Phase 5's auto-approve-created ones).

## Display revocation cascades to its pairings (Display Secret Lifecycle Hardening)

`POST /api/displays/:displayId/revoke` (display-secret-authenticated) does
more than mark the display itself revoked (see SECURITY_NOTES.md's
"Display secret lifecycle" section for the display-secret side of this).
It also cascades to everything that display paired with:

- Every `device_pairings` row for that display gets its `revokedAt` set
  (`revokeAllPairingsForDisplay`) — any controller still holding a token
  for this display is rejected on its very next request.
- Any live/unconsumed `pairing_sessions` row for that display (i.e. not
  already `used`/`rejected`/`expired`) is transitioned to `cancelled`
  (`cancelActivePairingSessionsForDisplay`) — this is the first code path
  that actually sets the `cancelled` `PairingSessionStatus` value; it was
  previously modeled in the shared type but unreachable (see the "Low"
  risk entry for it in `SECURITY_AUDIT_RAILWAY_READINESS.md`, now
  resolved).

**Why cascade rather than leave pairings dangling:** revoking a display is
meant to mean "this display is gone, nothing should be able to talk to it
anymore." Leaving its existing controller pairings valid would defeat that
— a controller could keep sending remote commands to a `displayId` whose
owner explicitly revoked it. A pending pairing request left in
`approval_pending` against a revoked display would also never get a
decision, so cancelling it lets a waiting controller's poll resolve to a
terminal state instead of hanging until the 5-minute TTL expires on its
own.

**Design payoff — zero changes needed in `controllerAuth.ts`:** because
cascading revocation flips `device_pairings.revokedAt`, the existing
controller-auth check (`pairing.revokedAt` → `401`) already rejects any
token for a revoked display without any new code path. The cascade was
implemented entirely in the display-revoke handler and the repo layer.

## Controller auth on every remote request

Unchanged from Phase 5: `x-controller-token` (or `Authorization: Bearer`)
is hashed and looked up against `device_pairings.tokenHash`. The pairing
must exist, be non-revoked, and its `displayId` must match the `:displayId`
in the request URL (`403` otherwise) — a token from one pairing is useless
against any other display.

**This stacks on top of, not instead of, the API key.** Every `/api/*`
route — `/api/remote/*` included — requires `x-api-key` (or `Authorization:
Bearer <apiKey>`) via the `onRequest` hook registered on the whole `/api`
scope in `index.ts`, *before* `controllerAuth`'s `preHandler` even runs.
Both checks return the exact same `401 { ok: false, error: 'unauthorized'
}` body, so a request missing/wrong on either one looks identical from the
outside — if you get `unauthorized` on a `/api/remote/...` call, verify
both headers are set, not just the controller token. See
[BACKEND_API_SPEC.md](BACKEND_API_SPEC.md)'s auth model summary and
[CONTROLLER_CLI_TOOLS.md](CONTROLLER_CLI_TOOLS.md) for a case where this
exact ambiguity caused a script to send only the controller token.

## Why SHA-256, not bcrypt/scrypt

`displaySecret` and `controllerToken` are already uniformly-random 256-bit
values, not user-chosen low-entropy passwords. A slow KDF exists to make
brute-forcing a *small, guessable* keyspace expensive; here the keyspace is
already 2²⁵⁶, which is infeasible to search regardless of hash speed. A fast
hash is the right tool for this specific case — using bcrypt/scrypt would
add computational cost without adding real protection.

## Failed-attempt protection (Phase 5.1)

An in-memory sliding-window tracker
(`apps/server/src/security/failedPairingAttempts.ts`) blocks a given IP
with `429 too_many_failed_attempts` after 5 failed `POST
/api/controllers/pair` attempts within 5 minutes — bad format, unknown
code, or expired code all count. This stacks with (doesn't replace) the
existing 10/min route-level rate limit. In-memory means it resets on
server restart — acceptable for a local/LAN threat model, not a
production-grade brute-force defense.

## Errors reference

| Situation | Endpoint | Status | `error` |
|---|---|---|---|
| Malformed code | `POST /controllers/pair` | 400 | `code must be exactly 6 digits` |
| Unknown/already-claimed code | `POST /controllers/pair` | 404 | `invalid or already-used code` |
| Expired code | `POST /controllers/pair` | 410 | `code has expired` |
| Too many failed attempts | `POST /controllers/pair` | 429 | `too_many_failed_attempts` |
| Unknown request id | `GET .../pairing-requests/:id` | 404 | `not_found` |
| Approve/reject on wrong display or unknown id | `POST .../approve\|reject` | 404 | `not_found` |
| Approve/reject an already-decided request | `POST .../approve\|reject` | 409 | `not_approval_pending` |
| Approve/reject an expired request | `POST .../approve\|reject` | 410 | `request has expired` |
| Finalize before approval | `POST .../finalize` | 409 | `not_approved` |
| Finalize twice | `POST .../finalize` | 409 | `token_already_issued` |
| Revoked/invalid controller token | any `/api/remote/...` route | 401 | `unauthorized` |
| Token valid but for a different display | any `/api/remote/...` route | 403 | `this controller is not paired with that display` |

## Backward compatibility

Every `device_pairings` row created under Phase 5's auto-approve flow keeps
working unchanged — `controllerAuth`, `revokePairing`, and every remote
command route read that table exactly as before; this phase only changes
how *new* pairings get created. Verified by starting the server against a
database containing pre-5.1 pairings and confirming `/api/status` and
display/pairing reads still succeed with no errors.

## Known limitations

- Pairing brute-force protection is a flat rate limit + in-memory counter,
  not a lockout/backoff scheme — acceptable for a local/LAN threat model,
  not for internet exposure.
- Controller tokens are valid indefinitely (until revoked) unless
  `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` is set, in which case they also
  stop authenticating (`401 token_expired`) once that TTL passes — empty/
  unset by default, recommended 30–90 days for a public deployment (see
  `RAILWAY_DEPLOYMENT_PLAN.md`). Display secrets now have the same
  optional-TTL and explicit-revocation treatment via
  `PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS` and `POST
  /api/displays/:displayId/{rotate-secret,revoke}` — see
  SECURITY_NOTES.md's "Display secret lifecycle" section.
- Max 5 concurrent `approval_pending` requests per display — a 6th
  attempt gets `409 too_many_pending_requests` (added in the Security
  Hardening phase).
- `GET /api/displays/:displayId/pairings` and the pairing-requests
  approve/reject routes require the display's own secret — a controller
  cannot self-inspect its own pairing; only the display side exposes that.
  It *can* self-revoke — see "Controller self-unpair" below.
- No way for a controller to explicitly cancel a request it created before
  the display acts on it — it can only stop polling locally (`Try Again` in
  the UI) and let the request expire naturally.

## Controller self-unpair

`POST /api/remote/displays/:displayId/unpair` — controller-token-authenticated
(same `createControllerAuth` guard as the rest of `/api/remote/*`), no body.
Revokes the calling controller's own `device_pairings` row
(`revokedAt = now`) server-side. Controller Mode's "Remove" button
(`useRemoteController.forgetPairing`) calls this before clearing the pairing
from its own `localStorage`, best-effort — an unreachable server doesn't
block the local removal, since a stale local pairing the user explicitly
asked to remove is worse than a stray still-active server-side row.

The Display side polls `GET /api/displays/:displayId/pairings` every 4s
(`useDisplayCommandListener`'s `PAIRINGS_POLL_MS`, same pattern as the 2s
pairing-requests poll) whenever a display is registered, independent of the
"Listen for Remote Commands" toggle. A revoked pairing is not removed from
the list outright — it stays visible with a `revoked` label (no `Revoke`
button) so the Display operator can see a controller *was* paired and no
longer is, rather than it silently vanishing.
