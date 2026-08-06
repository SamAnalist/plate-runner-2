import Fastify from 'fastify';
import cors from '@fastify/cors';

import { loadConfig } from './config';
import { initStorage } from './storage/db';
import { createCommandsRepo } from './storage/commandsRepo';
import { createListsRepo } from './storage/listsRepo';
import { createStatusService } from './services/statusService';
import { createCommandService } from './services/commandService';
import { createListService } from './services/listService';
import { createApiKeyAuth } from './security/apiKeyAuth';
import { registerRateLimit } from './security/rateLimit';
import { loggerOptions, registerRequestLogger } from './logging/requestLogger';
import { registerHealthRoute } from './routes/health';
import { registerStatusRoute } from './routes/status';
import { registerSimulateRoutes } from './routes/simulate';
import { registerSimulationControlRoutes } from './routes/simulationControl';
import { registerSimulationCommandsRoutes } from './routes/simulationCommands';
import { registerCommandsRoutes } from './routes/commands';
import { registerListsRoutes } from './routes/lists';

async function main() {
  const config = loadConfig();
  const storage = initStorage(config.storagePath);
  const commandsRepo = createCommandsRepo(storage);
  const listsRepo = createListsRepo(storage);

  const statusService = createStatusService(commandsRepo, storage);
  const fastify = Fastify({ logger: loggerOptions });
  const commandService = createCommandService(commandsRepo, fastify.log);
  const listService = createListService(listsRepo);

  await fastify.register(cors, { origin: true });
  registerRequestLogger(fastify);

  // External API callers commonly send Content-Type: application/json with no body on
  // bodiless POSTs (e.g. claim/complete/pause). Fastify's default parser rejects that
  // combination outright — treat an empty body as {} instead of 400ing every such call.
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const raw = body as string;
    if (raw.trim() === '') {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Unauthenticated — registered directly on the root instance.
  await registerHealthRoute(fastify);

  // Everything under /api requires the API key and is rate-limited.
  await fastify.register(async (apiScope) => {
    apiScope.addHook('onRequest', createApiKeyAuth(config.apiKey));
    await registerRateLimit(apiScope);
    await registerStatusRoute(apiScope, statusService);
    await registerSimulateRoutes(apiScope, commandService);
    await registerSimulationControlRoutes(apiScope, commandService);
    await registerSimulationCommandsRoutes(apiScope, commandService);
    await registerCommandsRoutes(apiScope, commandService);
    await registerListsRoutes(apiScope, listService, commandService);
  }, { prefix: '/api' });

  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`plate-runner-server listening on http://localhost:${config.port} (storage: ${storage.persistent ? 'sqlite' : 'in-memory fallback'})`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
