import type { StorageHandle } from './db';
import type { DisplayDevice, PairingSession, PairingSessionStatus, DevicePairingSummary } from '@plate-runner/shared';

interface DisplayRow {
  id: string;
  name: string;
  secretHash: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
}

interface PairingSessionRow {
  id: string;
  displayId: string;
  code: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  approvedAt: string | null;
  usedAt: string | null;
  controllerName: string | null;
}

interface DevicePairingRow {
  id: string;
  displayId: string;
  controllerId: string;
  tokenHash: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  controllerName?: string | null;
}

/** Server-internal shape — includes secretHash, never exported to the frontend. */
export interface DisplayDeviceRecord extends DisplayDevice {
  secretHash: string;
}

/** Server-internal shape — includes tokenHash, never exported to the frontend. */
export interface DevicePairingRecord {
  id: string;
  displayId: string;
  controllerId: string;
  tokenHash: string;
  name?: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  /** Optional TTL from PLATE_RUNNER_PAIRING_TOKEN_TTL_DAYS at finalize time — undefined means never expires. */
  expiresAt?: string;
}

function rowToDisplay(row: DisplayRow): DisplayDeviceRecord {
  return {
    id: row.id,
    name: row.name,
    secretHash: row.secretHash,
    status: row.status as DisplayDevice['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSeenAt: row.lastSeenAt ?? undefined,
  };
}

function rowToSession(row: PairingSessionRow): PairingSession {
  return {
    id: row.id,
    displayId: row.displayId,
    code: row.code,
    status: row.status as PairingSessionStatus,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    approvedAt: row.approvedAt ?? undefined,
    usedAt: row.usedAt ?? undefined,
    controllerName: row.controllerName ?? undefined,
  };
}

function rowToPairing(row: DevicePairingRow): DevicePairingRecord {
  return {
    id: row.id,
    displayId: row.displayId,
    controllerId: row.controllerId,
    tokenHash: row.tokenHash,
    name: row.name ?? undefined,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? undefined,
    revokedAt: row.revokedAt ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
  };
}

function rowToPairingSummary(row: DevicePairingRow): DevicePairingSummary {
  return {
    id: row.id,
    displayId: row.displayId,
    controllerId: row.controllerId,
    controllerName: row.controllerName ?? undefined,
    name: row.name ?? undefined,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? undefined,
    revokedAt: row.revokedAt ?? undefined,
  };
}

export function createRemoteRepo({ db }: StorageHandle) {
  // ── Displays ──────────────────────────────────────────────────────────
  const insertDisplayStmt = db.prepare(`
    INSERT INTO display_devices (id, name, secretHash, status, createdAt, updatedAt, lastSeenAt)
    VALUES (@id, @name, @secretHash, @status, @createdAt, @updatedAt, @lastSeenAt)
  `);
  const getDisplayStmt = db.prepare(`SELECT * FROM display_devices WHERE id = ?`);
  const touchDisplayHeartbeatStmt = db.prepare(`
    UPDATE display_devices SET status = 'online', lastSeenAt = @lastSeenAt, updatedAt = @lastSeenAt WHERE id = @id
  `);
  const listDisplaysStmt = db.prepare(`SELECT * FROM display_devices ORDER BY createdAt DESC`);

  // ── Controllers ───────────────────────────────────────────────────────
  const insertControllerStmt = db.prepare(`
    INSERT INTO controller_devices (id, name, createdAt, updatedAt, lastSeenAt)
    VALUES (@id, @name, @createdAt, @updatedAt, @lastSeenAt)
  `);
  const getControllerStmt = db.prepare(`SELECT * FROM controller_devices WHERE id = ?`);

  // ── Pairing sessions ──────────────────────────────────────────────────
  const insertSessionStmt = db.prepare(`
    INSERT INTO pairing_sessions (id, displayId, code, status, createdAt, expiresAt, approvedAt, usedAt)
    VALUES (@id, @displayId, @code, @status, @createdAt, @expiresAt, @approvedAt, @usedAt)
  `);
  const updateSessionStmt = db.prepare(`
    UPDATE pairing_sessions
    SET status = @status, approvedAt = @approvedAt, usedAt = @usedAt, controllerName = @controllerName
    WHERE id = @id
  `);
  const getPendingSessionForDisplayStmt = db.prepare(`
    SELECT * FROM pairing_sessions WHERE displayId = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1
  `);
  const getSessionByCodeStmt = db.prepare(`
    SELECT * FROM pairing_sessions WHERE code = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1
  `);
  const getSessionByIdStmt = db.prepare(`SELECT * FROM pairing_sessions WHERE id = ?`);
  const listApprovalPendingForDisplayStmt = db.prepare(`
    SELECT * FROM pairing_sessions WHERE displayId = ? AND status = 'approval_pending' ORDER BY createdAt ASC
  `);
  const expirePendingForDisplayStmt = db.prepare(`
    UPDATE pairing_sessions SET status = 'expired' WHERE displayId = ? AND status = 'pending'
  `);

  // ── Device pairings ───────────────────────────────────────────────────
  const insertPairingStmt = db.prepare(`
    INSERT INTO device_pairings (id, displayId, controllerId, tokenHash, name, createdAt, lastUsedAt, revokedAt, expiresAt)
    VALUES (@id, @displayId, @controllerId, @tokenHash, @name, @createdAt, @lastUsedAt, @revokedAt, @expiresAt)
  `);
  const getPairingByTokenHashStmt = db.prepare(`SELECT * FROM device_pairings WHERE tokenHash = ?`);
  const getPairingByIdStmt = db.prepare(`SELECT * FROM device_pairings WHERE id = ?`);
  const listPairingsForDisplayStmt = db.prepare(`
    SELECT device_pairings.*, controller_devices.name as controllerName
    FROM device_pairings
    LEFT JOIN controller_devices ON controller_devices.id = device_pairings.controllerId
    WHERE device_pairings.displayId = ?
    ORDER BY device_pairings.createdAt DESC
  `);
  const revokePairingStmt = db.prepare(`UPDATE device_pairings SET revokedAt = @revokedAt WHERE id = @id`);
  const touchPairingLastUsedStmt = db.prepare(`UPDATE device_pairings SET lastUsedAt = @lastUsedAt WHERE id = @id`);

  return {
    insertDisplay(display: DisplayDeviceRecord): void {
      insertDisplayStmt.run({ ...display, lastSeenAt: display.lastSeenAt ?? null });
    },
    getDisplayById(id: string): DisplayDeviceRecord | null {
      const row = getDisplayStmt.get(id) as DisplayRow | undefined;
      return row ? rowToDisplay(row) : null;
    },
    touchDisplayHeartbeat(id: string, lastSeenAt: string): void {
      touchDisplayHeartbeatStmt.run({ id, lastSeenAt });
    },
    listDisplays(): DisplayDeviceRecord[] {
      return (listDisplaysStmt.all() as DisplayRow[]).map(rowToDisplay);
    },

    insertController(controller: { id: string; name: string; createdAt: string; updatedAt: string; lastSeenAt?: string }): void {
      insertControllerStmt.run({ ...controller, lastSeenAt: controller.lastSeenAt ?? null });
    },
    getControllerById(id: string): { id: string; name: string } | null {
      const row = getControllerStmt.get(id) as { id: string; name: string } | undefined;
      return row ?? null;
    },

    insertPairingSession(session: PairingSession): void {
      insertSessionStmt.run({
        ...session,
        approvedAt: session.approvedAt ?? null,
        usedAt: session.usedAt ?? null,
      });
    },
    getPendingSessionForDisplay(displayId: string): PairingSession | null {
      const row = getPendingSessionForDisplayStmt.get(displayId) as PairingSessionRow | undefined;
      return row ? rowToSession(row) : null;
    },
    getSessionByCode(code: string): PairingSession | null {
      const row = getSessionByCodeStmt.get(code) as PairingSessionRow | undefined;
      return row ? rowToSession(row) : null;
    },
    getSessionById(id: string): PairingSession | null {
      const row = getSessionByIdStmt.get(id) as PairingSessionRow | undefined;
      return row ? rowToSession(row) : null;
    },
    listApprovalPendingForDisplay(displayId: string): PairingSession[] {
      return (listApprovalPendingForDisplayStmt.all(displayId) as PairingSessionRow[]).map(rowToSession);
    },
    updateSession(session: PairingSession): void {
      updateSessionStmt.run({
        id: session.id,
        status: session.status,
        approvedAt: session.approvedAt ?? null,
        usedAt: session.usedAt ?? null,
        controllerName: session.controllerName ?? null,
      });
    },
    expirePendingForDisplay(displayId: string): void {
      expirePendingForDisplayStmt.run(displayId);
    },

    insertDevicePairing(pairing: DevicePairingRecord): void {
      insertPairingStmt.run({
        ...pairing,
        name: pairing.name ?? null,
        lastUsedAt: pairing.lastUsedAt ?? null,
        revokedAt: pairing.revokedAt ?? null,
        expiresAt: pairing.expiresAt ?? null,
      });
    },
    getPairingByTokenHash(tokenHash: string): DevicePairingRecord | null {
      const row = getPairingByTokenHashStmt.get(tokenHash) as DevicePairingRow | undefined;
      return row ? rowToPairing(row) : null;
    },
    getPairingById(id: string): DevicePairingRecord | null {
      const row = getPairingByIdStmt.get(id) as DevicePairingRow | undefined;
      return row ? rowToPairing(row) : null;
    },
    listPairingsForDisplay(displayId: string): DevicePairingSummary[] {
      return (listPairingsForDisplayStmt.all(displayId) as DevicePairingRow[]).map(rowToPairingSummary);
    },
    revokePairing(id: string, revokedAt: string): void {
      revokePairingStmt.run({ id, revokedAt });
    },
    touchPairingLastUsed(id: string, lastUsedAt: string): void {
      touchPairingLastUsedStmt.run({ id, lastUsedAt });
    },
  };
}

export type RemoteRepo = ReturnType<typeof createRemoteRepo>;
