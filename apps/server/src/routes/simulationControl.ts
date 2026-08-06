import type { FastifyInstance } from 'fastify';
import type { SimulationCommandType } from '@plate-runner/shared';
import type { CommandService } from '../services/commandService';

const CONTROL_ROUTES: { path: string; type: SimulationCommandType }[] = [
  { path: '/simulation/pause', type: 'pause' },
  { path: '/simulation/resume', type: 'resume' },
  { path: '/simulation/stop', type: 'stop' },
  { path: '/simulation/skip-current', type: 'skip_current' },
  { path: '/simulation/open-gate', type: 'open_gate' },
];

/** POST /api/simulation/{pause,resume,stop,skip-current,open-gate} — each creates the correspondingly-typed command. */
export async function registerSimulationControlRoutes(fastify: FastifyInstance, commandService: CommandService): Promise<void> {
  for (const { path, type } of CONTROL_ROUTES) {
    fastify.post(path, async (request, reply) => {
      const command = commandService.createCommand(type, {}, request.ip);
      return reply.send({ ok: true, commandId: command.id });
    });
  }
}
