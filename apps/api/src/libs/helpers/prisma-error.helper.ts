const UNIQUE_VIOLATION_CODE = 'P2002';

/** Prisma's unique-constraint failure, recognised by narrowing instead of importing its class. */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === UNIQUE_VIOLATION_CODE;

export { isUniqueViolation };
