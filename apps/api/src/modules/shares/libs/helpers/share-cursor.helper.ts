import { ErrorCode, type ResourceKind } from '@data-room/contracts';
import { z } from 'zod';

import { HTTPCode } from '../../../../libs/modules/http/index.js';
import { ShareErrorMessage } from '../enums/index.js';
import { ShareError } from '../exceptions/index.js';

const cursorPayloadSchema = z.object({
  k: z.string(),
  t: z.string().uuid(),
  i: z.string().uuid(),
});

type ShareCursorScope = {
  targetKind: ResourceKind;
  targetId: string;
};

const invalidCursorError = (): ShareError =>
  new ShareError({
    code: ErrorCode.VALIDATION_ERROR,
    message: ShareErrorMessage.INVALID_CURSOR,
    status: HTTPCode.UNPROCESSABLE_ENTITY,
  });

const encodeShareCursor = (scope: ShareCursorScope, id: string): string =>
  Buffer.from(JSON.stringify({ k: scope.targetKind, t: scope.targetId, i: id }), 'utf8').toString(
    'base64url',
  );

// Decoding is not authorization: the policy has already answered for this target
const decodeShareCursor = (cursor: string, scope: ShareCursorScope): string => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursorError();
  }

  const result = cursorPayloadSchema.safeParse(parsed);

  if (!result.success || result.data.k !== scope.targetKind || result.data.t !== scope.targetId) {
    throw invalidCursorError();
  }

  return result.data.i;
};

export { decodeShareCursor, encodeShareCursor, type ShareCursorScope };
