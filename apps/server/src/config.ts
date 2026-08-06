import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DEV_DEFAULT_API_KEY = 'dev-local-key';
const DEV_DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:8080'];
const MIN_PRODUCTION_API_KEY_LENGTH = 32;
const DEFAULT_BODY_LIMIT_BYTES = 1_000_000;
const DEFAULT_RATE_LIMIT_GENERAL_PER_MIN = 100;
const DEFAULT_RATE_LIMIT_REMOTE_PER_MIN = 30;
const DEFAULT_RATE_LIMIT_PAIRING_PER_MIN = 10;

export interface ServerConfig {
  apiKey: string;
  port: number;
  storagePath: string;
  isProduction: boolean;
  corsOrigins: string[];
  bodyLimitBytes: number;
  /** null = tokens never expire (default, matches today's behavior). */
  pairingTokenTtlDays: number | null;
  /** null = display secrets never expire (default). Only applied to NEW/rotated
   * secrets, never retroactively — see docs/PAIRING_SPEC.md. */
  displaySecretTtlDays: number | null;
  rateLimits: {
    generalPerMinute: number;
    remotePerMinute: number;
    pairingPerMinute: number;
  };
}

/**
 * Thrown by loadConfig() when a hard production requirement isn't met.
 * Caught in index.ts's main() to log a clear message and exit(1) — never
 * includes the actual secret value, only what's wrong with it.
 */
export class ConfigError extends Error {}

/**
 * Whether hardened production rules (mandatory API key, no CORS fallback,
 * etc.) are enforced. Deliberately keyed ONLY on PLATE_RUNNER_ENV, not
 * NODE_ENV — apps/server/Dockerfile sets NODE_ENV=production unconditionally
 * for unrelated Node-ecosystem reasons, and local `docker compose up` must
 * keep working without a 32-char key. A real production/Railway deployment
 * sets PLATE_RUNNER_ENV=production explicitly (see docs/RAILWAY_DEPLOYMENT_PLAN.md).
 */
function resolveIsProduction(): boolean {
  return process.env.PLATE_RUNNER_ENV === 'production';
}

function readApiKey(isProduction: boolean): string {
  const fromEnv = process.env.PLATE_RUNNER_API_KEY?.trim();

  if (isProduction) {
    if (!fromEnv) {
      throw new ConfigError(
        'PLATE_RUNNER_API_KEY is required when PLATE_RUNNER_ENV=production. ' +
        'Generate one with `openssl rand -hex 32` and set it explicitly.',
      );
    }
    if (fromEnv === DEV_DEFAULT_API_KEY) {
      throw new ConfigError(
        `PLATE_RUNNER_API_KEY must not be the development default ("${DEV_DEFAULT_API_KEY}") when PLATE_RUNNER_ENV=production.`,
      );
    }
    if (fromEnv.length < MIN_PRODUCTION_API_KEY_LENGTH) {
      throw new ConfigError(
        `PLATE_RUNNER_API_KEY must be at least ${MIN_PRODUCTION_API_KEY_LENGTH} characters when PLATE_RUNNER_ENV=production (got ${fromEnv.length}).`,
      );
    }
    return fromEnv;
  }

  if (fromEnv) return fromEnv;
  console.warn(
    `⚠️  PLATE_RUNNER_API_KEY is not set — using the default dev key "${DEV_DEFAULT_API_KEY}". ` +
    'Fine for local development. Set PLATE_RUNNER_API_KEY and PLATE_RUNNER_ENV=production for anything else.',
  );
  return DEV_DEFAULT_API_KEY;
}

function readPort(): number {
  // Railway (and most PaaS) inject PORT; PLATE_RUNNER_SERVER_PORT is this
  // app's own override/local-dev variable, checked second.
  const raw = process.env.PORT || process.env.PLATE_RUNNER_SERVER_PORT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8787;
}

function readStoragePath(isProduction: boolean): string {
  const rawEnv = process.env.PLATE_RUNNER_STORAGE_PATH;
  if (isProduction && !rawEnv) {
    console.warn(
      '⚠️  PLATE_RUNNER_STORAGE_PATH is not set while PLATE_RUNNER_ENV=production — falling back to ./data. ' +
      'If this filesystem is ephemeral (e.g. a Railway service with no mounted Volume), SQLite data will be ' +
      'lost on every redeploy/restart. Set PLATE_RUNNER_STORAGE_PATH to a persistent Volume mount path.',
    );
  }
  const raw = rawEnv || './data';
  const absolute = resolve(process.cwd(), raw);
  mkdirSync(absolute, { recursive: true });
  return absolute;
}

function readCorsOrigins(isProduction: boolean): string[] {
  const raw = process.env.PLATE_RUNNER_CORS_ORIGINS;
  if (raw && raw.trim()) {
    return raw.split(',').map(o => o.trim()).filter(Boolean);
  }
  if (isProduction) {
    throw new ConfigError(
      'PLATE_RUNNER_CORS_ORIGINS is required when PLATE_RUNNER_ENV=production — set it to a comma-separated ' +
      'allowlist of the exact origin(s) your frontend is served from. No automatic localhost fallback in production.',
    );
  }
  console.warn(
    `⚠️  PLATE_RUNNER_CORS_ORIGINS is not set — allowing ${DEV_DEFAULT_CORS_ORIGINS.join(', ')} by default. ` +
    'Fine for local development, set PLATE_RUNNER_CORS_ORIGINS for anything else.',
  );
  return DEV_DEFAULT_CORS_ORIGINS;
}

function readBodyLimitBytes(): number {
  const raw = process.env.PLATE_RUNNER_BODY_LIMIT_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BODY_LIMIT_BYTES;
}

function readPairingTokenTtlDays(): number | null {
  const raw = process.env.PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS;
  if (!raw || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readDisplaySecretTtlDays(): number | null {
  const raw = process.env.PLATE_RUNNER_DISPLAY_SECRET_TTL_DAYS;
  if (!raw || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readRatePerMinute(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(): ServerConfig {
  const isProduction = resolveIsProduction();
  return {
    apiKey: readApiKey(isProduction),
    port: readPort(),
    storagePath: readStoragePath(isProduction),
    isProduction,
    corsOrigins: readCorsOrigins(isProduction),
    bodyLimitBytes: readBodyLimitBytes(),
    pairingTokenTtlDays: readPairingTokenTtlDays(),
    displaySecretTtlDays: readDisplaySecretTtlDays(),
    rateLimits: {
      generalPerMinute: readRatePerMinute('PLATE_RUNNER_RATE_LIMIT_GENERAL_PER_MIN', DEFAULT_RATE_LIMIT_GENERAL_PER_MIN),
      remotePerMinute: readRatePerMinute('PLATE_RUNNER_RATE_LIMIT_REMOTE_PER_MIN', DEFAULT_RATE_LIMIT_REMOTE_PER_MIN),
      pairingPerMinute: readRatePerMinute('PLATE_RUNNER_RATE_LIMIT_PAIRING_PER_MIN', DEFAULT_RATE_LIMIT_PAIRING_PER_MIN),
    },
  };
}
