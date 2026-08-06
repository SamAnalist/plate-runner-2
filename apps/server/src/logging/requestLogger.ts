import type { FastifyInstance, FastifyBaseLogger } from 'fastify';
import type { PinoLoggerOptions } from 'fastify/types/logger.js';

/**
 * Custom req serializer that ONLY ever includes {method, url, hostname,
 * remoteAddress} — never raw headers. This is what structurally guarantees
 * the API key can never leak into logs, rather than relying on remembering
 * to redact it somewhere.
 */
export const loggerOptions: PinoLoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    req(request) {
      return {
        method: request.method,
        url: request.url,
        hostname: request.hostname,
        remoteAddress: request.ip,
      };
    },
  },
};

/**
 * Logs exactly the fields requested: timestamp, method, path, statusCode,
 * ip, userAgent, requestId. Read explicitly from the request/reply — never
 * a generic header dump.
 */
export function registerRequestLogger(fastify: FastifyInstance): void {
  fastify.addHook('onResponse', async (request, reply) => {
    (fastify.log as FastifyBaseLogger).info({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.url,
      statusCode: reply.statusCode,
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.id,
    }, 'request');
  });
}
