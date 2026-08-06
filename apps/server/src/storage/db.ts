import { join } from 'node:path';
import Database from 'better-sqlite3';

export interface StorageHandle {
  db: Database.Database;
  /** True if backed by the real on-disk file; false if we had to fall back to an in-memory db. */
  persistent: boolean;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS simulation_commands (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    payload     TEXT NOT NULL,
    status      TEXT NOT NULL,
    createdAt   TEXT NOT NULL,
    updatedAt   TEXT NOT NULL,
    claimedAt   TEXT,
    completedAt TEXT,
    error       TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_commands_status ON simulation_commands(status);
  CREATE INDEX IF NOT EXISTS idx_commands_createdAt ON simulation_commands(createdAt);

  CREATE TABLE IF NOT EXISTS plate_lists (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    description         TEXT,
    plates              TEXT NOT NULL,
    simulationDefaults  TEXT NOT NULL,
    createdAt           TEXT NOT NULL,
    updatedAt           TEXT NOT NULL,
    version             INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS display_devices (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    secretHash  TEXT NOT NULL,
    status      TEXT NOT NULL,
    createdAt   TEXT NOT NULL,
    updatedAt   TEXT NOT NULL,
    lastSeenAt  TEXT
  );

  CREATE TABLE IF NOT EXISTS controller_devices (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    createdAt   TEXT NOT NULL,
    updatedAt   TEXT NOT NULL,
    lastSeenAt  TEXT
  );

  CREATE TABLE IF NOT EXISTS pairing_sessions (
    id          TEXT PRIMARY KEY,
    displayId   TEXT NOT NULL,
    code        TEXT NOT NULL,
    status      TEXT NOT NULL,
    createdAt   TEXT NOT NULL,
    expiresAt   TEXT NOT NULL,
    approvedAt  TEXT,
    usedAt      TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_pairing_sessions_display_status ON pairing_sessions(displayId, status);
  CREATE INDEX IF NOT EXISTS idx_pairing_sessions_code ON pairing_sessions(code);

  CREATE TABLE IF NOT EXISTS device_pairings (
    id          TEXT PRIMARY KEY,
    displayId   TEXT NOT NULL,
    controllerId TEXT NOT NULL,
    tokenHash   TEXT NOT NULL,
    name        TEXT,
    createdAt   TEXT NOT NULL,
    lastUsedAt  TEXT,
    revokedAt   TEXT,
    expiresAt   TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_device_pairings_display ON device_pairings(displayId);
  CREATE INDEX IF NOT EXISTS idx_device_pairings_tokenHash ON device_pairings(tokenHash);
`;

/**
 * Idempotently adds a column to an already-existing table if it's not there
 * yet — CREATE TABLE IF NOT EXISTS alone can't do this for a table that
 * predates the column (e.g. simulation_commands rows from before Phase 5).
 * Never destroys existing data.
 */
function ensureColumn(db: Database.Database, table: string, column: string, ddl: string): void {
  const columns = db.pragma(`table_info(${table})`) as { name: string }[];
  if (!columns.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function applyMigrations(db: Database.Database): void {
  ensureColumn(db, 'simulation_commands', 'displayId', 'displayId TEXT');
  ensureColumn(db, 'simulation_commands', 'source', "source TEXT NOT NULL DEFAULT 'unknown'");
  ensureColumn(db, 'simulation_commands', 'createdByControllerId', 'createdByControllerId TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS idx_commands_displayId ON simulation_commands(displayId)');
  // Macro Phase 5.1 — manual pairing approval: set when a controller claims a code
  // (status -> approval_pending), read back when finalize() creates the controller device.
  ensureColumn(db, 'pairing_sessions', 'controllerName', 'controllerName TEXT');
  // Security hardening — optional controller-token TTL (PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS).
  // Null means "never expires", matching the original no-TTL behavior.
  ensureColumn(db, 'device_pairings', 'expiresAt', 'expiresAt TEXT');
}

/**
 * Opens (creating if needed) the SQLite database under storagePath. Never
 * throws — if the on-disk file can't be opened (corrupted, permissions,
 * etc.), logs a clear error and falls back to an in-memory database so the
 * server still starts and functions, just without persistence across
 * restarts. Mirrors the frontend's localStorage-corruption philosophy.
 */
export function initStorage(storagePath: string): StorageHandle {
  const filePath = join(storagePath, 'plate-runner.sqlite3');
  try {
    const db = new Database(filePath);
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA);
    applyMigrations(db);
    return { db, persistent: true };
  } catch (err) {
    console.error(
      `⚠️  Could not open/initialize SQLite storage at ${filePath} (${(err as Error).message}). ` +
      'Falling back to an in-memory database — data will NOT persist across restarts until this is fixed.',
    );
    const db = new Database(':memory:');
    db.exec(SCHEMA);
    applyMigrations(db);
    return { db, persistent: false };
  }
}
