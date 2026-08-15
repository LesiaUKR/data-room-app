import { sanitizeSecrets } from './sanitize-secrets.helper.js';

const REDACTED = '[REDACTED]';
const CIRCULAR = '[CIRCULAR]';
const TRUNCATED = '[TRUNCATED]';
const MAX_DEPTH = 8;
const ERROR_KEY = 'err';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'passwordhash',
  'secret',
  'set-cookie',
  'signedurl',
  'token',
  'tokenhash',
]);

const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

// Log payloads are explicitly built plain objects; anything else is left to pino.
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const redactValue = (value: unknown, seen: WeakSet<object>, depth: number): unknown => {
  if (typeof value === 'string') {
    return sanitizeSecrets(value);
  }

  if (depth >= MAX_DEPTH) {
    return TRUNCATED;
  }

  if (isArray(value)) {
    if (seen.has(value)) {
      return CIRCULAR;
    }

    seen.add(value);

    return value.map((item) => redactValue(item, seen, depth + 1));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if (seen.has(value)) {
    return CIRCULAR;
  }

  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redactValue(item, seen, depth + 1),
    ]),
  );
};

// `err` is left to pino's error serializer, which runs after this formatter.
const redactLogObject = (logObject: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(logObject).map(([key, value]) => {
      if (key === ERROR_KEY) {
        return [key, value];
      }

      return [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redactValue(value, new WeakSet(), 0),
      ];
    }),
  );

export { redactLogObject };
