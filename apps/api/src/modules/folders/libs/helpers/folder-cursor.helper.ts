import { ErrorCode } from '@data-room/contracts';
import { z } from 'zod';

import { HTTPCode } from '../../../../libs/modules/http/index.js';
import { FolderErrorMessage } from '../enums/index.js';
import { FolderError } from '../exceptions/index.js';

const FOLDER_KIND_RANK = 0;
const FILE_KIND_RANK = 1;

// Every real name is non-empty after trim, so this position precedes every row
const LIST_START = {
  kindRank: FOLDER_KIND_RANK,
  normalizedName: '',
  id: '00000000-0000-0000-0000-000000000000',
};

const cursorPayloadSchema = z.object({
  f: z.string().uuid(),
  k: z.union([z.literal(FOLDER_KIND_RANK), z.literal(FILE_KIND_RANK)]),
  n: z.string(),
  i: z.string().uuid(),
});

type FolderCursor = {
  kindRank: number;
  normalizedName: string;
  id: string;
};

const invalidCursorError = (): FolderError =>
  new FolderError({
    code: ErrorCode.VALIDATION_ERROR,
    message: FolderErrorMessage.INVALID_CURSOR,
    status: HTTPCode.UNPROCESSABLE_ENTITY,
  });

const encodeFolderCursor = (input: { folderId: string } & FolderCursor): string => {
  const payload = { f: input.folderId, k: input.kindRank, n: input.normalizedName, i: input.id };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

// Decoding is not authorization: a syntactically valid cursor from another list also decodes
const decodeFolderCursor = (cursor: string, folderId: string): FolderCursor => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursorError();
  }

  const result = cursorPayloadSchema.safeParse(parsed);

  if (!result.success || result.data.f !== folderId) {
    throw invalidCursorError();
  }

  return { kindRank: result.data.k, normalizedName: result.data.n, id: result.data.i };
};

export {
  decodeFolderCursor,
  encodeFolderCursor,
  FILE_KIND_RANK,
  FOLDER_KIND_RANK,
  LIST_START,
  type FolderCursor,
};
