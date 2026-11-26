import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { PROTOCOL_VERSION } from '@lanternfall/protocol';
import { z } from 'zod';
import { createIdentityVerifier, signDevToken } from './auth';
import type { AppEnv } from './env';
import { GameGateway } from './gateway';

export interface BuiltServer {
  app: FastifyInstance;
  gateway: GameGateway;
}

const devAuthBody = z.object({
  playerId: z.string().uuid().optional(),
  characterId: z.string().uuid().optional(),
  displayName: z.string().trim().min(1).max(32).optional(),
});

export async function buildServer(env: AppEnv): Promise<BuiltServer> {
  const serverId = env.SERVER_ID ?? randomUUID();
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const verifyToken = createIdentityVerifier({
    supabaseJwtSecret: env.SUPABASE_JWT_SECRET,
    supabaseJwksUrl: env.SUPABASE_JWKS_URL,
    issuer: env.SUPABASE_JWT_ISSUER,
    audience: env.SUPABASE_JWT_AUDIENCE,
    devJwtSecret: env.DEV_JWT_SECRET,
    devAuthEnabled: env.DEV_AUTH_ENABLED,
  });

  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    trustProxy: true,
    bodyLimit: 16 * 1024,
  });

  const gateway = new GameGateway({
    serverId,
    helloTimeoutMs: env.HELLO_TIMEOUT_MS,
    heartbeatIntervalMs: env.HEARTBEAT_INTERVAL_MS,
    deadTimeoutMs: env.DEAD_TIMEOUT_MS,
    sweepIntervalMs: env.SWEEP_INTERVAL_MS,
    reconnectGraceMs: env.RECONNECT_GRACE_MS,
    tickRate: env.TICK_RATE_HZ,
    maxPayloadBytes: env.MAX_PAYLOAD_BYTES,
    maxPlayers: env.MAX_PLAYERS,
    allowedOrigins,
    verifyToken,
    worldTimeSec: () => 0,
    logger: {
      info: (context, message) => {
        app.log.info(context, message);
      },
      warn: (context, message) => {
        app.log.warn(context, message);
      },
      error: (context, message) => {
        app.log.error(context, message);
      },
    },
  });

  gateway.attach(app.server);
  app.addHook('onClose', async () => {
    gateway.close();
  });

  app.get('/healthz', async () => ({
    status: 'ok',
    serverId,
    protocolVersion: PROTOCOL_VERSION,
    uptimeSec: Math.floor(process.uptime()),
  }));

  app.get('/readyz', async () => ({
    status: gateway.attached ? 'ready' : 'starting',
    serverId,
    sessions: gateway.getMetrics().authenticatedSessions,
  }));

  const metricsEnabled = env.METRICS_ENABLED ?? env.NODE_ENV !== 'production';
  if (metricsEnabled) {
    app.get('/metrics', async () => ({
      serverId,
      ...gateway.getMetrics(),
    }));
  }

  const devSecret = env.DEV_JWT_SECRET;
  if (env.DEV_AUTH_ENABLED && devSecret) {
    app.post('/auth/dev', async (request, reply) => {
      const parsed = devAuthBody.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          error: { code: 'INVALID_BODY', message: 'Invalid development session request' },
        });
      }

      const playerId = parsed.data.playerId ?? randomUUID();
      const characterId = parsed.data.characterId ?? randomUUID();
      const displayName = parsed.data.displayName ?? 'Field Tester';
      const token = await signDevToken({
        secret: devSecret,
        playerId,
        characterId,
        displayName,
      });

      return reply.send({
        token,
        playerId,
        characterId,
        displayName,
        serverId,
        expiresInSec: 12 * 60 * 60,
      });
    });
  }

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  );

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    return reply.code(status).send({
      error: {
        code: status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        message: status >= 500 ? 'Internal server error' : error.message,
      },
    });
  });

  return { app, gateway };
}
