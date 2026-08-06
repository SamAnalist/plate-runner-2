import Fastify from 'fastify';
import cors from '@fastify/cors';

import { loadConfig } from './config';
import { initStorage } from './storage/db';
import { createCommandsRepo } from './storage/commandsRepo';
import { createListsRepo } from './storage/listsRepo';
import { createStatusService } from './services/statusService';
import { createApiKeyAuth } from './security/apiKeyAuth';
import { registerRateLimit } from './security/rateLimit';
import { loggerOptions, registerRequestLogger } from './logging/requestLogger';
import { registerHealthRoute } from './routes/health';
import { registerStatusRoute } from './routes/status';

async function main() {
  const config = loadConfig();
  const storage = initStorage(config.storagePath);
  const commandsRepo = createCommandsRepo(storage);
  const listsRepo = createListsRepo(storage);
  void listsRepo; // wired into routes in a later phase commit

  const statusService = createStatusService(commandsRepo, storage);

  const fastify = Fastify({ logger: loggerOptions });

  await fastify.register(cors, { origin: true });
  registerRequestLogger(fastify);

  // Unauthenticated — registered directly on the root instance.
  await registerHealthRoute(fastify);

  // Everything under /api requires the API key and is rate-limited.
  await fastify.register(async (apiScope) => {
    apiScope.addHook('onRequest', createApiKeyAuth(config.apiKey));
    await registerRateLimit(apiScope);
    await registerStatusRoute(apiScope, statusService);
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
