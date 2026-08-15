/**
 * Machine-readable failure identifiers shared by the API and the SPA. The client branches on
 * `code`, never on `message`. Mapping a code to an HTTP status is the API error middleware's
 * job — a contract describes what happened, not how the transport labels it.
 */
const ErrorCode = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Authorization
  FORBIDDEN: 'FORBIDDEN',

  // Missing, or belonging to someone else — the two are deliberately indistinguishable
  DATA_ROOM_NOT_FOUND: 'DATA_ROOM_NOT_FOUND',
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_VERSION_NOT_FOUND: 'FILE_VERSION_NOT_FOUND',
  SHARE_NOT_FOUND: 'SHARE_NOT_FOUND',

  // Conflict with the current state
  EMAIL_ALREADY_IN_USE: 'EMAIL_ALREADY_IN_USE',
  NAME_CONFLICT: 'NAME_CONFLICT',
  INVALID_FILE_VERSION_STATE: 'INVALID_FILE_VERSION_STATE',
  UPLOAD_INCOMPLETE: 'UPLOAD_INCOMPLETE',

  // Rejected input
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FOLDER_DEPTH_LIMIT_EXCEEDED: 'FOLDER_DEPTH_LIMIT_EXCEEDED',

  // Anything unexpected — returned without internal details
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export { ErrorCode };
