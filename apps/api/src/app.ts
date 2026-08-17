import { authContract, healthContract } from '@data-room/contracts';
import { createExpressEndpoints } from '@ts-rest/express';
import express, { type Express } from 'express';

import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  validationErrorHandler,
} from './libs/middleware/index.js';
import { config } from './libs/modules/config/index.js';
import { authRouter } from './modules/auth/auth.js';
import { healthRouter } from './modules/health/health.js';

const app: Express = express();
const JSON_BODY_LIMIT = '32kb';

app.disable('x-powered-by');

app.use(requestLogger);
app.use(express.json({ limit: JSON_BODY_LIMIT }));

createExpressEndpoints(authContract, authRouter, app, {
  logInitialization: false,
  requestValidationErrorHandler: validationErrorHandler,
  responseValidation: config.isDevelopment,
});

createExpressEndpoints(healthContract, healthRouter, app, {
  logInitialization: false,
  requestValidationErrorHandler: validationErrorHandler,
  responseValidation: config.isDevelopment,
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
