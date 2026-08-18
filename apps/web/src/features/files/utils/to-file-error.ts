import { ErrorCode, errorResponseSchema } from '@data-room/contracts';

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.';

type FileFailure = 'forbidden' | 'malformed' | 'missing' | 'offline' | 'unknown';

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
  ErrorCode.SHARE_NOT_FOUND,
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

  // A bad id in the path arrived with the link, so no amount of retrying turns it into a document
  if (code === ErrorCode.VALIDATION_ERROR) {
    return 'malformed';
  }

  if (
    code === ErrorCode.FILE_NOT_FOUND ||
    code === ErrorCode.FOLDER_NOT_FOUND ||
    code === ErrorCode.SHARE_NOT_FOUND
  ) {
    return 'missing';
  }

  return 'unknown';
};

const MISSING_MESSAGE = 'This document is no longer available. It may have been deleted.';
const MALFORMED_MESSAGE = 'This link is not valid. Check that you copied the whole address.';

/** What a viewer screen shows, and whether offering a retry would be honest. */
const toFileViewFailure = (value: unknown): { message: string; isTerminal: boolean } => {
  const failure = toFileFailure(value);

  if (failure === 'missing') {
    return { message: MISSING_MESSAGE, isTerminal: true };
  }

  if (failure === 'malformed') {
    return { message: MALFORMED_MESSAGE, isTerminal: true };
  }

  return { message: toFileErrorMessage(value), isTerminal: failure === 'forbidden' };
};

export { NETWORK_MESSAGE, toFileErrorMessage, toFileFailure, toFileViewFailure, type FileFailure };
