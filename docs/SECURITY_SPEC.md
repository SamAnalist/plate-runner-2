# Plate Runner — Security Specification

Version: 0.2 | Date: 2025-07-03

This document establishes security rules that apply to all phases of Plate Runner, including current frontend-only behavior and future backend/API features.

---

## 1. Plate Input Validation

### Rules (enforced now, in `packages/shared/src/validators/plate.ts`)

| Rule | Constraint | Enforced |
|---|---|---|
| Character set | `/^[A-Z0-9]+$/` only | Yes — current |
| Max length | 12 characters | Yes — current |
| Normalize | `toUpperCase()` before validate | Yes — current |
| No empty | `input.trim().length > 0` | Yes — current |
| No spaces | Rejected by charset rule | Yes — current |
| No hyphens | Rejected by charset rule | Yes — current |
| No symbols | Rejected by charset rule | Yes — current |

### Rationale

Plates are displayed on screen and may be read by external cameras or OCR systems. Invalid characters (spaces, symbols, markup) would produce incorrect visual output. The charset restriction is also a defense against injection.

---

## 2. HTML Injection Prevention

### Rule: No `dangerouslySetInnerHTML` anywhere

Plate text and all user-provided values must **never** be rendered via `dangerouslySetInnerHTML` or any equivalent that evaluates HTML/markup at runtime.

```tsx
// FORBIDDEN
<div dangerouslySetInnerHTML={{ __html: plate }} />

// REQUIRED
<text>{plate}</text>
```

### Enforcement

- Plate text is rendered as SVG `<text>` nodes only.
- React's JSX text interpolation (`{plate}`) is used exclusively — React escapes content by default.
- `textLength` + `lengthAdjust="spacingAndGlyphs"` prevent visual overflow, not injection (injection is already prevented by SVG text rendering).

### What this prevents

- XSS via crafted plate strings (e.g., `<script>alert(1)</script>`).
- Visual injection of SVG elements via plate content.
- React key or prop injection via controlled inputs.

---

## 3. SVG Rendering Safety

All simulation rendering is SVG-based. SVG text nodes are safe when rendered through React's JSX — React escapes `<`, `>`, `&`, `"`, and `'` in text content.

Rules:
- All plate text must go through the `<LicensePlate>` component, not directly into SVG strings.
- No plate value must be concatenated into SVG `d=`, `href=`, `filter=`, or other attributes that could interpret content.
- No `eval()`, `Function()`, or dynamic script creation anywhere in the simulation.

---

## 4. Future API Security (Backend Phase)

When the backend is introduced (Phase 0.4+), the following must be enforced:

### 4.1 API Key Authentication

- All REST endpoints (except `/health`) must require an `Authorization: Bearer <api-key>` header.
- API keys must be long random tokens (≥32 bytes, hex or base64).
- Keys must be stored server-side only; never embedded in frontend code or HTML.
- Keys must be rotatable without code deployment (env var / config file).

### 4.2 Remote Pairing Token

- Remote pairing between computers uses a separate long internal token (≥32 bytes).
- Pairing codes shown to users (short alphanumeric codes like `ABC-123`) are display identifiers only — they are **not** security secrets.
- The actual session authorization uses the internal token, not the display code.
- Pairings must be revocable (token invalidation endpoint or TTL-based expiry).

### 4.3 Payload Limits

When a request body is accepted:

| Endpoint type | Max body size |
|---|---|
| Plate run request | 4 KB |
| Plate list upload | 64 KB (max ~5,000 plates) |
| WebSocket message | 1 KB per frame |

Requests exceeding limits must be rejected with `413 Payload Too Large` before processing.

### 4.4 Rate Limiting

| Endpoint | Limit |
|---|---|
| `POST /api/v1/local/run` | 60 req/min per API key |
| `POST /api/v1/events/:id/open-gate` | 10 req/min per event |
| All other API endpoints | 120 req/min per API key |
| WebSocket connections | 5 concurrent per pairing token |

Rate limiting applies per API key, not per IP (to support CI/proxy environments).

### 4.5 Connection Logging

The backend must log:

- Timestamp of each API request.
- API key identifier (hashed or last 4 chars — never the full key).
- Remote IP.
- Endpoint and HTTP method.
- Response status code.
- Pairing session open/close events.
- Gate open signal events (who triggered, when, which event ID).

Logs must not contain:
- Full API keys.
- Plate data at DEBUG level (plates are not considered PII, but verbose logging should be opt-in).

### 4.6 No Secrets in Frontend

- API keys and pairing tokens must never appear in:
  - React component state/props.
  - Browser localStorage or sessionStorage (except user-initiated "remember this key" features, treated as sensitive).
  - Console logs.
  - HTML source or JavaScript bundles.
- Frontend communicates with backend using environment variables injected at build time for the base URL only.

---

## 5. Current Status (Phase 0.9 — Remote Display Mode + Pairing)

| Security concern | Status |
|---|---|
| Plate charset validation | Enforced (frontend + backend, same shared validator) |
| HTML injection prevention | Enforced |
| `dangerouslySetInnerHTML` | Not present in codebase |
| API key auth | Enforced on all `/api/*` routes — see [SECURITY_NOTES.md](SECURITY_NOTES.md) |
| Pairing token | Enforced — 256-bit random, SHA-256 hashed at rest, revocable, displayId-scoped. See [PAIRING_SPEC.md](PAIRING_SPEC.md) |
| Payload limits | Global 1MB body cap enforced; per-endpoint-type tiers still not implemented |
| Rate limiting | 100 req/min general; 10/min on pairing routes; 30/min on remote command routes |
| Connection logging | Enforced — timestamp/method/path/status/ip/userAgent/requestId, never the API key/secret/token |

Implementation details for the local backend introduced in this phase live
in [SECURITY_NOTES.md](SECURITY_NOTES.md) — this section only tracks status
against the checklist below.

---

## 6. Security Checklist for Future Phases

Before shipping any phase that introduces a backend or network communication:

- [ ] All API endpoints protected by API key middleware.
- [ ] Pairing flow uses internal token, not display code.
- [ ] Payload size limits configured at HTTP server level (not just application code).
- [ ] Rate limiting middleware applied globally.
- [ ] Connection events written to log (structured JSON preferred).
- [ ] No secrets in `apps/web/` build output.
- [ ] `dangerouslySetInnerHTML` audit: run `grep -r dangerouslySetInnerHTML apps/ packages/` before each release.
- [ ] Plate validation reused from `packages/shared` on the server side (no duplicate, weaker validation).
- [ ] CORS restricted to known origins (not `*`) in production.
- [ ] HTTPS enforced in production (Docker / reverse proxy level).
