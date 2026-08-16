import { type HealthResponse, HealthStatus } from '@data-room/contracts';

import { HTTPCode } from '../../libs/modules/http/index.js';
import { type HealthService } from './health.service.js';

type HealthControllerParameters = {
  healthService: HealthService;
};

type HealthCheckResult = {
  body: HealthResponse;
  status: typeof HTTPCode.OK | typeof HTTPCode.SERVICE_UNAVAILABLE;
};

class HealthController {
  private readonly healthService: HealthService;

  public constructor({ healthService }: HealthControllerParameters) {
    this.healthService = healthService;
  }

  public async check(): Promise<HealthCheckResult> {
    const body = await this.healthService.getStatus();

    // The dependency verdict belongs in the status line: monitors read codes, not JSON
    const status = body.status === HealthStatus.OK ? HTTPCode.OK : HTTPCode.SERVICE_UNAVAILABLE;

    return { status, body };
  }
}

export { HealthController, type HealthControllerParameters };
