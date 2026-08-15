import { app } from './app.js';
import { config } from './libs/modules/config/index.js';
import { logger } from './libs/modules/logger/index.js';

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, nodeEnv: config.nodeEnv }, 'API started');
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'Shutting down');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

for (const signal of SHUTDOWN_SIGNALS) {
  process.on(signal, () => {
    shutdown(signal);
  });
}
