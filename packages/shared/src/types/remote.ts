/**
 * Remote Display Mode + Pairing (Macro Phase 5).
 *
 * Only frontend-safe shapes live here — device secrets/tokens and their
 * hashes are server-internal only (apps/server/src/storage/remoteRepo.ts)
 * and are never exported from this package.
 */

export type RemoteRole = 'display' | 'controller';

export type PairingSessionStatus = 'pending' | 'approved' | 'expired' | 'cancelled' | 'used';
export const PAIRING_SESSION_STATUSES: PairingSessionStatus[] = [
  'pending', 'approved', 'expired', 'cancelled', 'used',
];

/** Where a SimulationCommand came from — see packages/shared/src/types/simulationCommand.ts. */
export type CommandSource = 'local_api' | 'remote_controller' | 'scheduler' | 'unknown';
export const COMMAND_SOURCES: CommandSource[] = ['local_api', 'remote_controller', 'scheduler', 'unknown'];

export interface DisplayDevice {
  id: string;
  name: string;
  status: 'online' | 'offline';
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
}

export interface PairingSession {
  id: string;
  displayId: string;
  code: string;
  status: PairingSessionStatus;
  createdAt: string;
  expiresAt: string;
  approvedAt?: string;
  usedAt?: string;
}

/**
 * Frontend-facing view of a device_pairings row — deliberately omits
 * tokenHash (never leaves the server) and the raw controller device row
 * (only its display name is useful to show).
 */
export interface DevicePairingSummary {
  id: string;
  displayId: string;
  controllerId: string;
  controllerName?: string;
  name?: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}
