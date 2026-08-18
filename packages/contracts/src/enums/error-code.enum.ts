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
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
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
  // The stored object's real content type, taken from a HEAD check, is not accepted
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',

  // Rejected input
  MALFORMED_REQUEST_BODY: 'MALFORMED_REQUEST_BODY',
  REQUEST_BODY_TOO_LARGE: 'REQUEST_BODY_TOO_LARGE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FOLDER_DEPTH_LIMIT_EXCEEDED: 'FOLDER_DEPTH_LIMIT_EXCEEDED',
  RECIPIENT_NOT_FOUND: 'RECIPIENT_NOT_FOUND',
  SELF_SHARE_NOT_ALLOWED: 'SELF_SHARE_NOT_ALLOWED',

  // Anything unexpected — returned without internal details
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export { ErrorCode };
