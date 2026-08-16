import { DependencyStatus, type HealthResponse, HealthStatus } from '@data-room/contracts';

import { logger } from '../../libs/modules/logger/index.js';
import { type HealthRepository } from './health.repository.js';

const UPTIME_PRECISION = 100;

// A health probe must answer even when the database does not. The driver's own connection
// timeout is the outer bound; this one keeps /health responsive well before that.
const DATABASE_PING_TIMEOUT_MS = 3_000;

/** Rejects once the deadline passes. The underlying query keeps running — we stop waiting. */
const rejectAfter = (timeoutMs: number): { promise: Promise<never>; cancel: () => void } => {
  let timer: NodeJS.Timeout;

  const promise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Database ping exceeded ${String(timeoutMs)}ms`));
    }, timeoutMs);
  });

  return { promise, cancel: () => clearTimeout(timer) };
};

type HealthServiceParameters = {
  healthRepository: HealthRepository;
};

class HealthService {
  private readonly healthRepository: HealthRepository;

  public constructor({ healthRepository }: HealthServiceParameters) {
    this.healthRepository = healthRepository;
  }

  public async getStatus(): Promise<HealthResponse> {
    const database = await this.checkDatabase();

    return {
      status: database === DependencyStatus.UP ? HealthStatus.OK : HealthStatus.DEGRADED,
      database,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime() * UPTIME_PRECISION) / UPTIME_PRECISION,
    };
  }

  /** The reason never reaches the response: /health is unauthenticated. */
  private async checkDatabase(): Promise<DependencyStatus> {
    const deadline = rejectAfter(DATABASE_PING_TIMEOUT_MS);

    try {
      await Promise.race([this.healthRepository.ping(), deadline.promise]);

      return DependencyStatus.UP;
    } catch (error) {
      logger.error({ err: error }, 'Database health check failed');

      return DependencyStatus.DOWN;
    } finally {
      deadline.cancel();
    }
  }
}

export { HealthService, type HealthServiceParameters };
