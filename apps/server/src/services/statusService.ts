import type { CommandsRepo } from '../storage/commandsRepo';
import type { StorageHandle } from '../storage/db';

export function createStatusService(commandsRepo: CommandsRepo, storage: StorageHandle) {
  return {
    getStatus() {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      return {
        ok: true,
        serverTime: now.toISOString(),
        storage: { type: 'sqlite' as const, ok: storage.persistent },
        commands: {
          pending: commandsRepo.countByStatus('pending'),
          claimed: commandsRepo.countByStatus('claimed'),
          completedLastHour: commandsRepo.countCompletedSince(oneHourAgo),
          failedLastHour: commandsRepo.countFailedSince(oneHourAgo),
        },
      };
    },
  };
}

export type StatusService = ReturnType<typeof createStatusService>;
