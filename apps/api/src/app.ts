import { healthContract } from '@data-room/contracts';
import { createExpressEndpoints } from '@ts-rest/express';
import express, { type Express } from 'express';

import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  validationErrorHandler,
} from './libs/middleware/index.js';
import { config } from './libs/modules/config/index.js';
import { healthRouter } from './modules/health/health.js';

const app: Express = express();

app.disable('x-powered-by');

app.use(requestLogger);
app.use(express.json());

createExpressEndpoints(healthContract, healthRouter, app, {
  logInitialization: false,
  requestValidationErrorHandler: validationErrorHandler,
  responseValidation: config.isDevelopment,
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
