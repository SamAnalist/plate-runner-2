import { randomUUID } from 'node:crypto';
import type { SimulationCommand, SimulationCommandStatus, SimulationCommandType, CommandSource } from '@plate-runner/shared';
import type { CommandsRepo } from '../storage/commandsRepo';

interface CommandLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
}

export type ClaimResult = { ok: true; command: SimulationCommand } | { ok: false; reason: 'not_found' | 'not_pending' };
export type CompleteResult = { ok: true; command: SimulationCommand } | { ok: false; reason: 'not_found' | 'not_claimed' };
export type FailResult = { ok: true; command: SimulationCommand } | { ok: false; reason: 'not_found' | 'not_claimed' };

/**
 * Owns the command lifecycle: pending -> claimed -> completed | failed.
 * ('cancelled' is a defined status with no endpoint that sets it yet —
 * reserved for future use, same as the 'set_config' command type.)
 */
export interface CreateCommandOptions {
  displayId?: string;
  source?: CommandSource;
  createdByControllerId?: string;
}

export function createCommandService(repo: CommandsRepo, logger: CommandLogger) {
  function createCommand(
    type: SimulationCommandType,
    payload: unknown,
    sourceIp: string,
    opts: CreateCommandOptions = {},
  ): SimulationCommand {
    const now = new Date().toISOString();
    const command: SimulationCommand = {
      id: randomUUID(),
      type,
      payload,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      displayId: opts.displayId,
      source: opts.source ?? 'unknown',
      createdByControllerId: opts.createdByControllerId,
    };
    repo.insert(command);
    logger.info({ commandId: command.id, type, sourceIp, displayId: opts.displayId, source: command.source, createdAt: now }, 'command created');
    return command;
  }

  function getCommand(id: string): SimulationCommand | null {
    return repo.getById(id);
  }

  function listPending(displayId?: string): SimulationCommand[] {
    return repo.listPending(displayId);
  }

  function listAll(limit?: number): SimulationCommand[] {
    return repo.listAll(limit);
  }

  function listByStatus(status: SimulationCommandStatus, limit?: number): SimulationCommand[] {
    return repo.listByStatus(status, limit);
  }

  function claimCommand(id: string): ClaimResult {
    const existing = repo.getById(id);
    if (!existing) return { ok: false, reason: 'not_found' };
    if (existing.status !== 'pending') return { ok: false, reason: 'not_pending' };
    const now = new Date().toISOString();
    const updated: SimulationCommand = { ...existing, status: 'claimed', claimedAt: now, updatedAt: now };
    repo.update(updated);
    return { ok: true, command: updated };
  }

  function completeCommand(id: string): CompleteResult {
    const existing = repo.getById(id);
    if (!existing) return { ok: false, reason: 'not_found' };
    if (existing.status !== 'claimed') return { ok: false, reason: 'not_claimed' };
    const now = new Date().toISOString();
    const updated: SimulationCommand = { ...existing, status: 'completed', completedAt: now, updatedAt: now };
    repo.update(updated);
    return { ok: true, command: updated };
  }

  function failCommand(id: string, error: string): FailResult {
    const existing = repo.getById(id);
    if (!existing) return { ok: false, reason: 'not_found' };
    if (existing.status !== 'claimed') return { ok: false, reason: 'not_claimed' };
    const now = new Date().toISOString();
    const updated: SimulationCommand = { ...existing, status: 'failed', completedAt: now, updatedAt: now, error };
    repo.update(updated);
    return { ok: true, command: updated };
  }

  return { createCommand, getCommand, listPending, listAll, listByStatus, claimCommand, completeCommand, failCommand };
}

export type CommandService = ReturnType<typeof createCommandService>;
