import { healthContract } from '@data-room/contracts';
import { initServer } from '@ts-rest/express';

import { prisma } from '../../libs/modules/database/index.js';
import { HealthController } from './health.controller.js';
import { HealthRepository } from './health.repository.js';
import { HealthService } from './health.service.js';

const healthRepository = new HealthRepository(prisma);
const healthService = new HealthService({ healthRepository });
const healthController = new HealthController({ healthService });

const server = initServer();

const healthRouter = server.router(healthContract, {
  check: () => healthController.check(),
});

export { healthRouter, healthService };
