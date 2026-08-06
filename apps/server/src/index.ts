import { networkInterfaces } from 'node:os';
import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { loadConfig, ConfigError } from './config';
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
  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`✖ Startup aborted: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const storage = initStorage(config.storagePath);
  const commandsRepo = createCommandsRepo(storage);
  const listsRepo = createListsRepo(storage);
  const remoteRepo = createRemoteRepo(storage);

  const statusService = createStatusService(commandsRepo, storage);
  const fastify = Fastify({ logger: loggerOptions, bodyLimit: config.bodyLimitBytes });
  const commandService = createCommandService(commandsRepo, fastify.log);
  const listService = createListService(listsRepo);
  const displayService = createDisplayService(remoteRepo, fastify.log, config.displaySecretTtlDays);
  const pairingService = createPairingService(remoteRepo, fastify.log, config.pairingTokenTtlDays);
  const failedAttempts = createFailedAttemptsTracker();

  await fastify.register(helmet);

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // No Origin header (curl, server-to-server) — allow, there's nothing to check against.
      // A disallowed origin gets no CORS headers (browsers enforce that client-side) rather
      // than an error — the request itself isn't blocked server-side, just not marked cross-origin-safe.
      // Non-browser clients are gated by the API key, not CORS — this is intentional, not a gap.
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

  // Never leak a stack trace in an HTTP response, in any environment. In production also
  // genericize the message for unexpected (5xx) errors — the real error is still logged
  // server-side via request.log.error, just not echoed back to the caller.
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error, event: 'unhandled_error' }, 'request error');
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500 && config.isProduction) {
      return reply.code(statusCode).send({ ok: false, error: 'internal_error' });
    }
    return reply.code(statusCode).send({ ok: false, error: error.message });
  });

  // Unauthenticated — registered directly on the root instance.
  await registerHealthRoute(fastify);

  // Everything under /api requires the API key and is rate-limited.
  await fastify.register(async (apiScope) => {
    apiScope.addHook('onRequest', createApiKeyAuth(config.apiKey));
    await registerRateLimit(apiScope, config.rateLimits.generalPerMinute);
    await registerStatusRoute(apiScope, statusService);
    await registerSimulateRoutes(apiScope, commandService);
    await registerSimulationControlRoutes(apiScope, commandService);
    await registerSimulationCommandsRoutes(apiScope, commandService);
    await registerCommandsRoutes(apiScope, commandService);
    await registerListsRoutes(apiScope, listService, commandService);
    await registerDisplaysRoutes(apiScope, displayService, pairingService, commandService, config.rateLimits.pairingPerMinute);
    await registerControllersRoutes(apiScope, pairingService, failedAttempts, config.rateLimits.pairingPerMinute);
    await registerRemoteRoutes(apiScope, commandService, remoteRepo, config.rateLimits.remotePerMinute);
  }, { prefix: '/api' });

  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`plate-runner-server listening on http://localhost:${config.port} (storage: ${storage.persistent ? 'sqlite' : 'in-memory fallback'}, env: ${config.isProduction ? 'production' : 'development'})`);
    for (const address of lanAddresses()) {
      console.log(`  also reachable from other devices on this network at: http://${address}:${config.port}`);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

/** Non-internal IPv4 addresses this machine has — printed at startup so whoever starts the backend can immediately give the right URL to another device on the LAN. */
function lanAddresses(): string[] {
  const addresses: string[] = [];
  for (const iface of Object.values(networkInterfaces())) {
    for (const info of iface ?? []) {
      if (info.family === 'IPv4' && !info.internal) addresses.push(info.address);
    }
  }
  return addresses;
}

main();
