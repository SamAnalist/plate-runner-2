import type { StorageHandle } from './db';
import type { PlateList } from '@plate-runner/shared';

interface ListRow {
  id: string;
  name: string;
  description: string | null;
  plates: string;
  simulationDefaults: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

function rowToList(row: ListRow): PlateList {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    plates: JSON.parse(row.plates),
    simulationDefaults: JSON.parse(row.simulationDefaults),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export function createListsRepo({ db }: StorageHandle) {
  const insertStmt = db.prepare(`
    INSERT INTO plate_lists (id, name, description, plates, simulationDefaults, createdAt, updatedAt, version)
    VALUES (@id, @name, @description, @plates, @simulationDefaults, @createdAt, @updatedAt, @version)
  `);
  const updateStmt = db.prepare(`
    UPDATE plate_lists
    SET name = @name, description = @description, plates = @plates, simulationDefaults = @simulationDefaults, updatedAt = @updatedAt, version = @version
    WHERE id = @id
  `);
  const deleteStmt = db.prepare(`DELETE FROM plate_lists WHERE id = ?`);
  const getStmt = db.prepare(`SELECT * FROM plate_lists WHERE id = ?`);
  const listAllStmt = db.prepare(`SELECT * FROM plate_lists ORDER BY updatedAt DESC`);

  function toRow(list: PlateList) {
    return {
      id: list.id,
      name: list.name,
      description: list.description ?? null,
      plates: JSON.stringify(list.plates),
      simulationDefaults: JSON.stringify(list.simulationDefaults),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      version: list.version,
    };
  }

  return {
    upsert(list: PlateList): void {
      const existing = getStmt.get(list.id);
      if (existing) updateStmt.run(toRow(list));
      else insertStmt.run(toRow(list));
    },
    delete(id: string): void {
      deleteStmt.run(id);
    },
    getById(id: string): PlateList | null {
      const row = getStmt.get(id) as ListRow | undefined;
      return row ? rowToList(row) : null;
    },
    listAll(): PlateList[] {
      return (listAllStmt.all() as ListRow[]).map(rowToList);
    },
  };
}

export type ListsRepo = ReturnType<typeof createListsRepo>;
