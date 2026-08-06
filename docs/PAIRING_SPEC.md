# Pairing Spec

How a Controller and a Display establish trust, and the security model
behind it. See [REMOTE_MODE_SPEC.md](REMOTE_MODE_SPEC.md) for the broader
picture and [BACKEND_API_SPEC.md](BACKEND_API_SPEC.md) for the endpoint
reference.

## The two credentials

| | 6-digit pairing code | `displaySecret` / `controllerToken` |
|---|---|---|
| Purpose | One-time claim ticket | The actual, long-lived credential |
| Lifetime | 5 minutes | Until revoked |
| Generated with | `crypto.randomInt` | `crypto.randomBytes(32)` (256 bits) |
| Stored server-side as | Plaintext (short-lived, low stakes) | SHA-256 hash only — **never plaintext** |
| Shown to the user | Yes, large on the Display's screen | Once, at creation time, then never again |

The code is never itself a credential — pairing a controller consumes the
code and issues a token; nothing about controlling a display afterward ever
touches the code again.

## Display registration

`POST /api/displays/register` → `{ displayId, displaySecret }`. The secret
is hashed (SHA-256) before being stored in `display_devices.secretHash`; the
plaintext value is returned exactly once and the frontend persists it to
`localStorage` (`platerunner_display_registration`). Every subsequent
display-authenticated request sends it via `x-display-secret` (or
`Authorization: Bearer`).

## Requesting a code

`POST /api/displays/:displayId/pairing-code` (display-secret-authenticated):

- Generates a fresh 6-digit code (`crypto.randomInt(0, 1_000_000)`,
  zero-padded).
- `expiresAt = now + 5 minutes`.
- **Cancels/expires any existing pending code for that display first** — at
  most one pending code per display at any time. Calling this again is how
  the Display's "Regenerate Code" button works.
- Rate-limited to 10 requests/minute per route (see
  [SECURITY_NOTES.md](SECURITY_NOTES.md)).

## Pairing (Controller side)

`POST /api/controllers/pair` with `{ controllerName, code }`:

1. `code` must match `/^\d{6}$/` — otherwise `400`.
2. Looks up a **pending** session with that code — `404` if none exists
   (already used, never existed, or belongs to an expired/cancelled
   session that's no longer `pending`).
3. If found but its `expiresAt` has passed, marks it `expired` and returns
   `410`.
4. Otherwise: creates a `controller_devices` row, generates a
   `controllerToken` (32 random bytes), stores only its hash in
   `device_pairings.tokenHash`, marks the pairing session `used`, and
   returns `{ controllerId, displayId, displayName, pairingId,
   controllerToken }` — the token appears in this one response and nowhere
   else, ever.

This phase **auto-approves** — there's no manual "confirm on the Display"
step. `PairingSessionStatus` already includes an `approved` state between
`pending` and `used` specifically so a future phase can insert manual
confirmation without a breaking schema change.

## Revocation

`POST /api/displays/:displayId/pairings/:pairingId/revoke`
(display-secret-authenticated) sets `revokedAt`. Every subsequent
controller-authenticated request with that token is checked against
`revokedAt` and rejected with `401` immediately — there's no grace period
or cache to invalidate.

## Controller auth on every remote request

`x-controller-token` (or `Authorization: Bearer`) is hashed and looked up
against `device_pairings.tokenHash`. Two checks, both enforced server-side
on every request, not just at pairing time:

1. The pairing exists and `revokedAt` is unset → otherwise `401`.
2. The pairing's `displayId` matches the `:displayId` in the request URL →
   otherwise `403` ("this controller is not paired with that display").
   This is what makes "a controller can only control displays it's paired
   with" an enforced invariant, not just a UI convention — a controller
   token stolen from one display's pairing is useless against any other
   display.

## Why SHA-256, not bcrypt/scrypt

`displaySecret` and `controllerToken` are already uniformly-random 256-bit
values, not user-chosen low-entropy passwords. A slow KDF exists to make
brute-forcing a *small, guessable* keyspace expensive; here the keyspace is
already 2²⁵⁶, which is infeasible to search regardless of hash speed. A fast
hash is the right tool for this specific case — using bcrypt/scrypt would
add computational cost without adding real protection.

## Known limitations

- No manual Display-side pairing confirmation (auto-approve only) — see
  "Recommended Next Phase" for this being an obvious next step.
- Pairing brute-force protection is a flat rate limit (10/min on the pair
  route), not a lockout/backoff scheme — acceptable for a local/LAN threat
  model, not for internet exposure.
- No pairing expiry/TTL beyond explicit revocation — a paired controller's
  token is valid indefinitely until someone revokes it.
- `GET /api/displays/:displayId/pairings` requires the display's own secret
  — a controller cannot self-inspect or self-revoke its own pairing; only
  the display side exposes that.
