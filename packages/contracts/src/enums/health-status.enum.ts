/** Overall answer of the health endpoint: the API is up, with or without its dependencies. */
const HealthStatus = {
  OK: 'ok',
  DEGRADED: 'degraded',
} as const;

type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus];

export { HealthStatus };
