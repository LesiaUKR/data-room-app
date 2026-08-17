import { ErrorCode, errorResponseSchema } from '@data-room/contracts';

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.';

const NAME_DETAIL_PATH = 'body.name';

type FolderFieldName = 'name' | 'root';

type FolderErrorEntry = {
  field: FolderFieldName;
  message: string;
};

type FolderFailure = 'forbidden' | 'missing' | 'offline' | 'unknown';

const isHttpError = (error: unknown): error is { status: number; body: unknown } =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number';

const parseErrorBody = (error: unknown): { code: string; message: string } | null => {
  if (!isHttpError(error)) {
    return null;
  }

  const parsed = errorResponseSchema.safeParse(error.body);

  return parsed.success ? parsed.data.error : null;
};

const toFolderErrors = (error: unknown): FolderErrorEntry[] => {
  if (!isHttpError(error)) {
    return [{ field: 'root', message: NETWORK_MESSAGE }];
  }

  const parsed = errorResponseSchema.safeParse(error.body);

  if (!parsed.success) {
    return [{ field: 'root', message: UNKNOWN_MESSAGE }];
  }

  const { code, details, message } = parsed.data.error;

  if (code === ErrorCode.NAME_CONFLICT) {
    return [{ field: 'name', message }];
  }

  if (code === ErrorCode.VALIDATION_ERROR && details !== undefined && details.length > 0) {
    return details.map((detail) => ({
      field: detail.path === NAME_DETAIL_PATH ? 'name' : 'root',
      message: detail.message,
    }));
  }

  if (
    code === ErrorCode.FOLDER_DEPTH_LIMIT_EXCEEDED ||
    code === ErrorCode.FORBIDDEN ||
    code === ErrorCode.FOLDER_NOT_FOUND
  ) {
    return [{ field: 'root', message }];
  }

  return [{ field: 'root', message: UNKNOWN_MESSAGE }];
};

const toFolderFailure = (error: unknown): FolderFailure => {
  if (!isHttpError(error)) {
    return 'offline';
  }

  const parsed = parseErrorBody(error);

  if (parsed?.code === ErrorCode.FORBIDDEN) {
    return 'forbidden';
  }

  if (parsed?.code === ErrorCode.FOLDER_NOT_FOUND) {
    return 'missing';
  }

  return 'unknown';
};

export {
  toFolderErrors,
  toFolderFailure,
  type FolderErrorEntry,
  type FolderFailure,
  type FolderFieldName,
};
