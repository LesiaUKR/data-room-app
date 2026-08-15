import { type HealthResponse } from '@data-room/contracts';

const UPTIME_PRECISION = 100;

class HealthService {
  public getStatus(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime() * UPTIME_PRECISION) / UPTIME_PRECISION,
    };
  }
}

export { HealthService };
