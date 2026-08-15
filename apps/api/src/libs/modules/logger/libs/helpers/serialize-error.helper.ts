import { stdSerializers } from 'pino';

import { sanitizeSecrets } from './sanitize-secrets.helper.js';

// Three fields only — libraries attach payloads to errors; err() folds the cause chain in.
const serializeError = (error: unknown): Record<string, string> => {
  try {
    if (!(error instanceof Error)) {
      return { type: 'NonError', message: `Thrown value of type ${typeof error}` };
    }

    const serialized = stdSerializers.err(error);

    return {
      type: serialized.type,
      message: sanitizeSecrets(serialized.message ?? ''),
      stack: sanitizeSecrets(serialized.stack ?? ''),
    };
  } catch {
    return { type: 'UnserializableError', message: 'Error serialization failed.' };
  }
};

export { serializeError };
