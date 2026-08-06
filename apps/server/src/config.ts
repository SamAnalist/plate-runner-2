import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DEV_DEFAULT_API_KEY = 'dev-local-key';

export interface ServerConfig {
  apiKey: string;
  port: number;
  storagePath: string;
  isProduction: boolean;
}

function readApiKey(): string {
  const fromEnv = process.env.PLATE_RUNNER_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const isProduction = process.env.NODE_ENV === 'production';
  const banner = isProduction
    ? '⚠️  PLATE_RUNNER_API_KEY is not set in a production-like environment (NODE_ENV=production). ' +
      `Falling back to the well-known default "${DEV_DEFAULT_API_KEY}" — this is NOT secure if this ` +
      'server is reachable from anywhere other than your own machine. Set PLATE_RUNNER_API_KEY explicitly.'
    : `⚠️  PLATE_RUNNER_API_KEY is not set — using the default dev key "${DEV_DEFAULT_API_KEY}". ` +
      'Fine for local development, set PLATE_RUNNER_API_KEY for anything else.';
  console.warn(banner);
  return DEV_DEFAULT_API_KEY;
}

function readPort(): number {
  const raw = process.env.PLATE_RUNNER_SERVER_PORT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8787;
}

function readStoragePath(): string {
  const raw = process.env.PLATE_RUNNER_STORAGE_PATH || './data';
  const absolute = resolve(process.cwd(), raw);
  mkdirSync(absolute, { recursive: true });
  return absolute;
}

export function loadConfig(): ServerConfig {
  return {
    apiKey: readApiKey(),
    port: readPort(),
    storagePath: readStoragePath(),
    isProduction: process.env.NODE_ENV === 'production',
  };
}
