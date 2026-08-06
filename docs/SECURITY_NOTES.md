# Security Notes — Local Backend (Macro Phase 4)

Implementation-level notes for this phase. The broader, longer-lived policy
document is [SECURITY_SPEC.md](SECURITY_SPEC.md) — §4 of that document
described the target state for "Future API Security"; this note records what
was actually implemented against it and what's explicitly deferred.

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
  hashing/rotation endpoint this phase (SECURITY_SPEC.md §4.1 flags rotation
  as a future requirement; today rotation means restarting the process with
  a new env var).
- On the frontend, the key lives in React state (`useApiCommandListener`)
  and is only ever attached as a request header — never logged to the
  console, never rendered into the DOM.

## Validation

- Every plate/enum/config value accepted by the backend goes through the
  same `@plate-runner/shared` validators the frontend uses — no duplicate,
  weaker validation path exists on the server.
- Plate text is never rendered as HTML anywhere in this stack (unchanged
  from SECURITY_SPEC.md §2/§3 — the backend only stores/forwards plate
  strings as JSON values, never interpolates them into markup).

## Rate limiting

`@fastify/rate-limit`, 100 requests/minute per IP, applied to the whole
`/api/*` scope. This is intentionally basic — SECURITY_SPEC.md §4.4's
per-endpoint/per-API-key limits are a future refinement, not implemented
this phase.

## CORS

`origin: true` (reflects any request origin). This is a **local-only
relaxation** — acceptable because this server is not exposed beyond
localhost/LAN in this phase, but it must be tightened to an explicit origin
allowlist before any deployment that isn't strictly local (SECURITY_SPEC.md
§6 checklist item: "CORS restricted to known origins... in production").

## Payload limits

No explicit body-size cap configured this phase beyond Fastify's own
defaults. SECURITY_SPEC.md §4.3's specific KB limits per endpoint type are
not yet enforced — flagged as a gap, not silently skipped.

## What's explicitly out of scope this phase

- Pairing tokens, remote sessions, multi-device auth — no remote mode yet.
- HTTPS/TLS termination — assumed to be handled by a reverse proxy in any
  deployment that needs it; not configured here.
- API key hashing/rotation tooling.
- Per-endpoint/per-key rate limit tiers (SECURITY_SPEC.md §4.4).

## Local-only assumption

Every relaxation above (`origin: true`, no per-key rate tiers, no payload
caps, key rotation = process restart) is safe specifically because this
server is designed to run on `localhost`/a trusted LAN, next to the browser
tab that talks to it. None of it should be treated as "good enough" once
Remote Mode introduces exposure beyond that trust boundary — re-audit this
document at that point.
