import type { FastifyInstance } from 'fastify';

const SERVICE_VERSION = '0.1.0';

/** Registered directly on the root Fastify instance — outside the /api auth scope, intentionally unauthenticated. */
export async function registerHealthRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/health', async () => ({
    ok: true,
    service: 'plate-runner-server',
    version: SERVICE_VERSION,
    time: new Date().toISOString(),
  }));
}
