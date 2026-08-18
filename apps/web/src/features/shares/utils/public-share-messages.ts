import { ErrorCode, errorResponseSchema } from '@data-room/contracts';

/** One wording for every dead link: unknown, revoked, expired or pointing at a deleted resource. */
const LINK_UNAVAILABLE_MESSAGE = 'This link is no longer available.';
const LINK_INVALID_MESSAGE = 'This link is not valid. Check that you copied the whole address.';
const LINK_TEMPORARY_MESSAGE = 'We could not open this shared link. Please try again.';

type PublicShareViewFailure = {
  message: string;
  isTerminal: boolean;
};

const isHttpResponse = (value: unknown): value is { status: number; body: unknown } =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  typeof value.status === 'number';

/** Public pages deliberately hide whether the token or its target stopped existing. */
const toPublicShareViewFailure = (value: unknown): PublicShareViewFailure => {
  if (!isHttpResponse(value)) {
    return { message: LINK_TEMPORARY_MESSAGE, isTerminal: false };
  }

  const parsed = errorResponseSchema.safeParse(value.body);

  if (!parsed.success) {
    return { message: LINK_TEMPORARY_MESSAGE, isTerminal: false };
  }

  const { code } = parsed.data.error;

  if (code === ErrorCode.VALIDATION_ERROR) {
    return { message: LINK_INVALID_MESSAGE, isTerminal: true };
  }

  if (
    code === ErrorCode.SHARE_NOT_FOUND ||
    code === ErrorCode.DATA_ROOM_NOT_FOUND ||
    code === ErrorCode.FOLDER_NOT_FOUND ||
    code === ErrorCode.FILE_NOT_FOUND ||
    code === ErrorCode.FORBIDDEN
  ) {
    return { message: LINK_UNAVAILABLE_MESSAGE, isTerminal: true };
  }

  return { message: LINK_TEMPORARY_MESSAGE, isTerminal: false };
};

export { LINK_UNAVAILABLE_MESSAGE, toPublicShareViewFailure };
