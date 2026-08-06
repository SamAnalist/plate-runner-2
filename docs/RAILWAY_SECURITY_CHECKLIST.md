# Railway Pre-Deploy Security Checklist

A standalone, exhaustive checklist to run through before *any* Railway
deploy of Plate Runner (staging or, later, production). This is the
superset version — some items here are static repo checks rather than
deploy-time actions, unlike
[RAILWAY_STAGING_SMOKE_TEST.md](RAILWAY_STAGING_SMOKE_TEST.md)'s
runtime script, and unlike
[RAILWAY_DEPLOYMENT_PLAN.md](RAILWAY_DEPLOYMENT_PLAN.md)'s shorter
inline pre-deploy checklist (that one stays as-is; this doc is the full
version linked from it).

Check every box before deploying. If any item can't be checked,
document why in your deployment notes before proceeding — don't skip
silently.

## Environment configuration

- [ ] `PLATE_RUNNER_ENV=production` is set on `plate-runner-server`.
      This is the flag that turns on all production guard rails in
      `apps/server/src/config.ts` — it is deliberately **not** the same
      as `NODE_ENV` (see that file's `resolveIsProduction` comment).
- [ ] `NODE_ENV=production` is set (already baked into
      `apps/server/Dockerfile` — confirm it wasn't overridden).
- [ ] `PLATE_RUNNER_API_KEY` is strong (≥32 chars, generated via
      `openssl rand -hex 32` or equivalent — see
      `RAILWAY_DEPLOYMENT_PLAN.md`'s "API key generation and rotation"
      section), and is **not** `dev-local-key` or any other guessable
      default. The
      server refuses to start in production mode otherwise
      (`config.ts`'s `readApiKey`) — confirmed live in the smoke test's
      step 3.
- [ ] `PLATE_RUNNER_CORS_ORIGINS` is set to the **exact** origin(s) the
      frontend is served from (scheme + host, no path, no trailing
      slash, no wildcard). The server refuses to start without this in
      production mode.
- [ ] A Railway Volume is attached to `plate-runner-server`.
- [ ] `PLATE_RUNNER_STORAGE_PATH` points at that Volume's mount path
      (e.g. `/data`) — not the container's ephemeral filesystem.
- [ ] `PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS` is set to a deliberate value
      for this deployment (recommended 30–90 for anything beyond a
      short-lived demo) — or deliberately left unset, documented as an
      accepted risk.
- [ ] `PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS` is set to a deliberate
      value (same 30–90 day recommendation) — or deliberately left
      unset. Remember: not retroactive, only applies to newly
      registered/rotated secrets (`SECURITY_NOTES.md`).
- [ ] Rate limits are configured deliberately —
      `PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN`,
      `PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN`,
      `PLATE_RUNNER_RATE_LIMIT_PAIRING_PER_MIN` — or left at their safe
      defaults intentionally, not by accident.
- [ ] `PLATE_RUNNER_BODY_LIMIT_BYTES` is configured or deliberately left
      at its default.

## Secrets hygiene

- [ ] Server logs (checked in Railway's log viewer after some traffic)
      contain no plaintext `displaySecret`, `controllerToken`, or
      `PLATE_RUNNER_API_KEY` value.
- [ ] No secrets are committed anywhere in the repo — `git log -p` /
      `git grep` the diff for anything resembling a generated key or
      token before pushing; `.env.example`, `.env.production.example`,
      and `.env.railway.example` contain only placeholders/guidance,
      never real values.
- [ ] `.env` (and any real per-environment env file) is listed in
      `.gitignore` — only the `.example` files are tracked.
- [ ] The API key is stored **only** in Railway's Variables tab for
      each environment, never in a committed file, chat log, or ticket.

## Network / domains

- [ ] `plate-runner-web`'s public Railway URL (and any custom domain)
      is documented somewhere durable for this deployment.
- [ ] `plate-runner-server`'s public Railway URL is documented
      similarly.
- [ ] If this is a staging environment, its URLs are visibly and
      unambiguously distinct from any future production URLs (e.g.
      `-staging` in the Railway service/project name) — nobody should
      be able to confuse the two by looking at a URL.
- [ ] CORS origin(s) exactly match the frontend's real deployed
      origin(s) — re-verify after any custom-domain change, since a
      stale entry either breaks the frontend or (worse) silently keeps
      allowing an old origin that's no longer yours.

## Sign-off

- [ ] `RAILWAY_STAGING_SMOKE_TEST.md` has been run end-to-end against
      this deployment with no unexplained failures.
- [ ] `SECURITY_AUDIT_RAILWAY_READINESS.md`'s residual risks have been
      re-read and are acceptable for this deployment's actual use case.

Only once every applicable box is checked (or its exception is
documented) should this deployment be considered ready.
