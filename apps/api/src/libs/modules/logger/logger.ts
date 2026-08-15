import { pino, type Logger } from 'pino';

import { config } from '../config/index.js';
import { redactLogObject, serializeError } from './libs/helpers/index.js';

const logger: Logger = pino({
  level: config.logLevel,
  formatters: { log: redactLogObject },
  serializers: { err: serializeError },
  transport: config.isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l' } }
    : undefined,
});

export { logger };
