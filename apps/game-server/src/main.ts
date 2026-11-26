import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env';
import { buildServer } from './http';

// Load the repository-root .env when present (local development only).
// Platform-provided environment variables always take precedence.
const rootEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const env = loadEnv();
const { app } = await buildServer(env);

await app.listen({ host: env.HOST, port: env.PORT });
app.log.info(
  { host: env.HOST, port: env.PORT, nodeEnv: env.NODE_ENV },
  'Lanternfall game server listening',
);

let shuttingDown = false;

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, 'graceful shutdown started');

  const forceTimer = setTimeout(() => {
    app.log.error('graceful shutdown timed out');
    process.exit(1);
  }, 8000);
  forceTimer.unref();

  try {
    await app.close();
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'graceful shutdown failed');
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
