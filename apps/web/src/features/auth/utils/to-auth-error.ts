import { ErrorCode, errorResponseSchema } from '@data-room/contracts';

const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const UNKNOWN_MESSAGE = 'Something went wrong. Please try again.';

const FIELD_BY_DETAIL_PATH: Record<string, AuthFieldName> = {
  'body.email': 'email',
  'body.password': 'password',
};

type AuthFieldName = 'email' | 'password' | 'root';

type AuthErrorEntry = {
  field: AuthFieldName;
  message: string;
};

const isHttpError = (error: unknown): error is { status: number; body: unknown } =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number';

const groupByField = (entries: AuthErrorEntry[]): AuthErrorEntry[] => {
  const byField = new Map<AuthFieldName, string[]>();

  for (const entry of entries) {
    byField.set(entry.field, [...(byField.get(entry.field) ?? []), entry.message]);
  }

  return [...byField].map(([field, messages]) => ({ field, message: messages.join('. ') }));
};

const toAuthErrors = (error: unknown): AuthErrorEntry[] => {
  if (!isHttpError(error)) {
    return [{ field: 'root', message: NETWORK_MESSAGE }];
  }

  const parsed = errorResponseSchema.safeParse(error.body);

  if (!parsed.success) {
    return [{ field: 'root', message: UNKNOWN_MESSAGE }];
  }

  const { code, details, message } = parsed.data.error;

  if (code === ErrorCode.EMAIL_ALREADY_IN_USE) {
    return [{ field: 'email', message }];
  }

  // The API refuses to say which credential was wrong; the form must not guess either
  if (code === ErrorCode.INVALID_CREDENTIALS) {
    return [{ field: 'root', message }];
  }

  if (code === ErrorCode.VALIDATION_ERROR && details !== undefined && details.length > 0) {
    return groupByField(
      details.map((detail) => ({
        field: FIELD_BY_DETAIL_PATH[detail.path] ?? 'root',
        message: detail.message,
      })),
    );
  }

  return [{ field: 'root', message: UNKNOWN_MESSAGE }];
};

export { toAuthErrors, type AuthErrorEntry, type AuthFieldName };
