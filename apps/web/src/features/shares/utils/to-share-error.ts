import { ErrorCode, errorResponseSchema } from '@data-room/contracts';

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.';

// The only validation path the recipient field owns; every other one belongs to the form
const RECIPIENT_DETAIL_PATH = 'body.recipientEmail';

type ShareFieldName = 'recipientEmail' | 'root';

type ShareErrorEntry = {
  field: ShareFieldName;
  message: string;
};

type ShareFailure = 'forbidden' | 'missing' | 'offline' | 'unknown';

const isHttpError = (error: unknown): error is { status: number; body: unknown } =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number';

const parseErrorBody = (error: unknown): { code: ErrorCode; message: string } | null => {
  if (!isHttpError(error)) {
    return null;
  }

  const parsed = errorResponseSchema.safeParse(error.body);

  return parsed.success ? parsed.data.error : null;
};

const toShareErrors = (error: unknown): ShareErrorEntry[] => {
  if (!isHttpError(error)) {
    return [{ field: 'root', message: NETWORK_MESSAGE }];
  }

  const parsed = errorResponseSchema.safeParse(error.body);

  if (!parsed.success) {
    return [{ field: 'root', message: UNKNOWN_MESSAGE }];
  }

  const { code, details, message } = parsed.data.error;

  // Both are 422s about the recipient the user just typed, so they belong under that input
  if (code === ErrorCode.RECIPIENT_NOT_FOUND || code === ErrorCode.SELF_SHARE_NOT_ALLOWED) {
    return [{ field: 'recipientEmail', message }];
  }

  if (code === ErrorCode.VALIDATION_ERROR && details !== undefined && details.length > 0) {
    return details.map((detail) => ({
      field: detail.path === RECIPIENT_DETAIL_PATH ? 'recipientEmail' : 'root',
      message: detail.message,
    }));
  }

  if (
    code === ErrorCode.FORBIDDEN ||
    code === ErrorCode.SHARE_NOT_FOUND ||
    code === ErrorCode.DATA_ROOM_NOT_FOUND ||
    code === ErrorCode.FOLDER_NOT_FOUND ||
    code === ErrorCode.FILE_NOT_FOUND ||
    code === ErrorCode.REQUEST_BODY_TOO_LARGE
  ) {
    return [{ field: 'root', message }];
  }

  return [{ field: 'root', message: UNKNOWN_MESSAGE }];
};

const toShareFailure = (error: unknown): ShareFailure => {
  if (!isHttpError(error)) {
    return 'offline';
  }

  const code = parseErrorBody(error)?.code;

  if (code === ErrorCode.FORBIDDEN) {
    return 'forbidden';
  }

  if (
    code === ErrorCode.SHARE_NOT_FOUND ||
    code === ErrorCode.DATA_ROOM_NOT_FOUND ||
    code === ErrorCode.FOLDER_NOT_FOUND ||
    code === ErrorCode.FILE_NOT_FOUND
  ) {
    return 'missing';
  }

  return 'unknown';
};

export {
  toShareErrors,
  toShareFailure,
  type ShareErrorEntry,
  type ShareFailure,
  type ShareFieldName,
};
