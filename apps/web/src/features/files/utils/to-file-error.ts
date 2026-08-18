import { ErrorCode, errorResponseSchema } from '@data-room/contracts';

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.';

type FileFailure = 'forbidden' | 'missing' | 'offline' | 'unknown';

const isHttpResponse = (value: unknown): value is { status: number; body: unknown } =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof value.status === 'number';

const parseErrorBody = (value: unknown): { code: string; message: string } | null => {
  if (!isHttpResponse(value)) {
    return null;
  }

  const parsed = errorResponseSchema.safeParse(value.body);

  return parsed.success ? parsed.data.error : null;
};

const KNOWN_CODES = new Set<string>([
  ErrorCode.FILE_NOT_FOUND,
  ErrorCode.FILE_VERSION_NOT_FOUND,
  ErrorCode.FOLDER_NOT_FOUND,
  ErrorCode.FORBIDDEN,
  ErrorCode.INVALID_FILE_VERSION_STATE,
  ErrorCode.NAME_CONFLICT,
  ErrorCode.UNSUPPORTED_FILE_TYPE,
  ErrorCode.UPLOAD_INCOMPLETE,
]);

/** Accepts both a thrown client error and a non-2xx ts-rest response, which share this shape. */
const toFileErrorMessage = (value: unknown): string => {
  if (!isHttpResponse(value)) {
    return NETWORK_MESSAGE;
  }

  const parsed = errorResponseSchema.safeParse(value.body);

  if (!parsed.success) {
    return UNKNOWN_MESSAGE;
  }

  const { code, details, message } = parsed.data.error;

  if (code === ErrorCode.VALIDATION_ERROR) {
    return details?.[0]?.message ?? message;
  }

  return KNOWN_CODES.has(code) ? message : UNKNOWN_MESSAGE;
};

const toFileFailure = (value: unknown): FileFailure => {
  if (!isHttpResponse(value)) {
    return 'offline';
  }

  const code = parseErrorBody(value)?.code;

  if (code === ErrorCode.FORBIDDEN) {
    return 'forbidden';
  }

  if (code === ErrorCode.FILE_NOT_FOUND || code === ErrorCode.FOLDER_NOT_FOUND) {
    return 'missing';
  }

  return 'unknown';
};

export { NETWORK_MESSAGE, toFileErrorMessage, toFileFailure, type FileFailure };
