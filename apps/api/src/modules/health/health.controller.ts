import { type HealthResponse } from '@data-room/contracts';

import { HTTPCode } from '../../libs/modules/http/index.js';
import { type HealthService } from './health.service.js';

type HealthControllerParameters = {
  healthService: HealthService;
};

class HealthController {
  private readonly healthService: HealthService;

  public constructor({ healthService }: HealthControllerParameters) {
    this.healthService = healthService;
  }

  public check(): Promise<{ body: HealthResponse; status: typeof HTTPCode.OK }> {
    return Promise.resolve({ status: HTTPCode.OK, body: this.healthService.getStatus() });
  }
}

export { HealthController, type HealthControllerParameters };
