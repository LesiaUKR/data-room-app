import { healthContract } from '@data-room/contracts';
import { initServer } from '@ts-rest/express';

import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

const healthService = new HealthService();
const healthController = new HealthController({ healthService });

const server = initServer();

const healthRouter = server.router(healthContract, {
  check: () => healthController.check(),
});

export { healthRouter, healthService };
