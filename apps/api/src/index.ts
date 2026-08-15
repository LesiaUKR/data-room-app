import { ErrorCode } from '@data-room/contracts';

// Temporary: proves apps/api resolves the workspace package under NodeNext resolution and
// consumes both its runtime value and its derived type.
// Replaced by app.ts / server.ts / api/index.ts in Issue 02.
const unknownFailureCode: ErrorCode = ErrorCode.INTERNAL_ERROR;

export { unknownFailureCode };
