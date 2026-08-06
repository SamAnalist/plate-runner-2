import Fastify from 'fastify';
import cors from '@fastify/cors';

import { loadConfig } from './config';
import { initStorage } from './storage/db';
import { createCommandsRepo } from './storage/commandsRepo';
import { createListsRepo } from './storage/listsRepo';
import { createRemoteRepo } from './storage/remoteRepo';
import { createStatusService } from './services/statusService';
import { createCommandService } from './services/commandService';
import { createListService } from './services/listService';
import { createDisplayService } from './services/displayService';
import { createPairingService } from './services/pairingService';
import { createApiKeyAuth } from './security/apiKeyAuth';
import { registerRateLimit } from './security/rateLimit';
import { createFailedAttemptsTracker } from './security/failedPairingAttempts';
import { loggerOptions, registerRequestLogger } from './logging/requestLogger';
import { registerHealthRoute } from './routes/health';
import { registerStatusRoute } from './routes/status';
import { registerSimulateRoutes } from './routes/simulate';
import { registerSimulationControlRoutes } from './routes/simulationControl';
import { registerSimulationCommandsRoutes } from './routes/simulationCommands';
import { registerCommandsRoutes } from './routes/commands';
import { registerListsRoutes } from './routes/lists';
import { registerDisplaysRoutes } from './routes/displays';
import { registerControllersRoutes } from './routes/controllers';
import { registerRemoteRoutes } from './routes/remote';

async function main() {
  const config = loadConfig();
  const storage = initStorage(config.storagePath);
  const commandsRepo = createCommandsRepo(storage);
  const listsRepo = createListsRepo(storage);
  const remoteRepo = createRemoteRepo(storage);

  const statusService = createStatusService(commandsRepo, storage);
  // 1MB — generous for JSON simulation/list payloads, small enough to reject abuse before it reaches route handlers.
  const fastify = Fastify({ logger: loggerOptions, bodyLimit: 1_000_000 });
  const commandService = createCommandService(commandsRepo, fastify.log);
  const listService = createListService(listsRepo);
  const displayService = createDisplayService(remoteRepo, fastify.log);
  const pairingService = createPairingService(remoteRepo, fastify.log);
  const failedAttempts = createFailedAttemptsTracker();

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // No Origin header (curl, server-to-server) — allow, there's nothing to check against.
      // A disallowed origin gets no CORS headers (browsers enforce that client-side) rather
      // than an error — the request itself isn't blocked server-side, just not marked cross-origin-safe.
      cb(null, !origin || config.corsOrigins.includes(origin));
    },
  });
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
    await registerDisplaysRoutes(apiScope, displayService, pairingService, commandService);
    await registerControllersRoutes(apiScope, pairingService, failedAttempts);
    await registerRemoteRoutes(apiScope, commandService, remoteRepo);
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
