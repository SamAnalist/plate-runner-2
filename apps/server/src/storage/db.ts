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
`;

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
    return { db, persistent: true };
  } catch (err) {
    console.error(
      `⚠️  Could not open/initialize SQLite storage at ${filePath} (${(err as Error).message}). ` +
      'Falling back to an in-memory database — data will NOT persist across restarts until this is fixed.',
    );
    const db = new Database(':memory:');
    db.exec(SCHEMA);
    return { db, persistent: false };
  }
}
