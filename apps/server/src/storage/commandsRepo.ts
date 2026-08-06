import type { StorageHandle } from './db';
import type { SimulationCommand, SimulationCommandStatus } from '@plate-runner/shared';

interface CommandRow {
  id: string;
  type: string;
  payload: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

function rowToCommand(row: CommandRow): SimulationCommand {
  return {
    id: row.id,
    type: row.type as SimulationCommand['type'],
    payload: JSON.parse(row.payload),
    status: row.status as SimulationCommandStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    claimedAt: row.claimedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    error: row.error ?? undefined,
  };
}

export function createCommandsRepo({ db }: StorageHandle) {
  const insertStmt = db.prepare(`
    INSERT INTO simulation_commands (id, type, payload, status, createdAt, updatedAt, claimedAt, completedAt, error)
    VALUES (@id, @type, @payload, @status, @createdAt, @updatedAt, @claimedAt, @completedAt, @error)
  `);
  const updateStmt = db.prepare(`
    UPDATE simulation_commands
    SET status = @status, updatedAt = @updatedAt, claimedAt = @claimedAt, completedAt = @completedAt, error = @error
    WHERE id = @id
  `);
  const getStmt = db.prepare(`SELECT * FROM simulation_commands WHERE id = ?`);
  const listPendingStmt = db.prepare(`SELECT * FROM simulation_commands WHERE status = 'pending' ORDER BY createdAt ASC`);
  const listAllStmt = db.prepare(`SELECT * FROM simulation_commands ORDER BY createdAt DESC LIMIT ?`);
  const listByStatusStmt = db.prepare(`SELECT * FROM simulation_commands WHERE status = ? ORDER BY createdAt DESC LIMIT ?`);
  const countByStatusStmt = db.prepare(`SELECT COUNT(*) as count FROM simulation_commands WHERE status = ?`);
  const countCompletedSinceStmt = db.prepare(`SELECT COUNT(*) as count FROM simulation_commands WHERE status = 'completed' AND completedAt >= ?`);
  const countFailedSinceStmt = db.prepare(`SELECT COUNT(*) as count FROM simulation_commands WHERE status = 'failed' AND updatedAt >= ?`);

  return {
    insert(command: SimulationCommand): void {
      insertStmt.run({
        id: command.id,
        type: command.type,
        payload: JSON.stringify(command.payload),
        status: command.status,
        createdAt: command.createdAt,
        updatedAt: command.updatedAt,
        claimedAt: command.claimedAt ?? null,
        completedAt: command.completedAt ?? null,
        error: command.error ?? null,
      });
    },
    update(command: SimulationCommand): void {
      updateStmt.run({
        id: command.id,
        status: command.status,
        updatedAt: command.updatedAt,
        claimedAt: command.claimedAt ?? null,
        completedAt: command.completedAt ?? null,
        error: command.error ?? null,
      });
    },
    getById(id: string): SimulationCommand | null {
      const row = getStmt.get(id) as CommandRow | undefined;
      return row ? rowToCommand(row) : null;
    },
    listPending(): SimulationCommand[] {
      return (listPendingStmt.all() as CommandRow[]).map(rowToCommand);
    },
    listAll(limit = 200): SimulationCommand[] {
      return (listAllStmt.all(limit) as CommandRow[]).map(rowToCommand);
    },
    listByStatus(status: SimulationCommandStatus, limit = 200): SimulationCommand[] {
      return (listByStatusStmt.all(status, limit) as CommandRow[]).map(rowToCommand);
    },
    countByStatus(status: SimulationCommandStatus): number {
      return (countByStatusStmt.get(status) as { count: number }).count;
    },
    countCompletedSince(iso: string): number {
      return (countCompletedSinceStmt.get(iso) as { count: number }).count;
    },
    countFailedSince(iso: string): number {
      return (countFailedSinceStmt.get(iso) as { count: number }).count;
    },
  };
}

export type CommandsRepo = ReturnType<typeof createCommandsRepo>;
