import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { emailSchema } from './auth.contract.js';
import { ResourceKind, ShareRole, ShareType } from './enums/index.js';
import { errorResponseSchema } from './error-response.schema.js';

const c = initContract();

const SHARES_PAGE_SIZE_DEFAULT = 20;
const SHARES_PAGE_SIZE_MAX = 100;

const sharesPageSize = {
  default: SHARES_PAGE_SIZE_DEFAULT,
  max: SHARES_PAGE_SIZE_MAX,
} as const;

const shareIdParamsSchema = z.object({
  shareId: z.string().uuid(),
});

const shareTargetSchema = z.object({
  kind: z.nativeEnum(ResourceKind),
  id: z.string().uuid(),
});

const shareTargetViewBase = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

// A data room is not listable itself, so a recipient needs the folder to start from; for the
// other two kinds `id` is already that target. This is what lets the client build the URL.
const shareTargetViewSchema = z.discriminatedUnion('kind', [
  shareTargetViewBase.extend({
    kind: z.literal(ResourceKind.DATA_ROOM),
    rootFolderId: z.string().uuid(),
  }),
  shareTargetViewBase.extend({ kind: z.literal(ResourceKind.FOLDER) }),
  shareTargetViewBase.extend({ kind: z.literal(ResourceKind.FILE) }),
]);

const shareSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(ShareType),
  role: z.nativeEnum(ShareRole),
  target: shareTargetViewSchema,
  recipientEmail: z.string().email().nullable(),
  createdAt: z.string().datetime(),
});

// Mirrors share_grant_type_target_check: a link carries no recipient, a user grant requires one
const createShareSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(ShareType.PUBLIC_LINK),
    target: shareTargetSchema,
  }),
  z.object({
    type: z.literal(ShareType.USER),
    target: shareTargetSchema,
    recipientEmail: emailSchema,
  }),
]);

const createdShareSchema = z.object({
  share: shareSchema,
  // Plaintext, returned by this response only - the database keeps just its hash
  token: z.string().nullable(),
});

const listSharesQuerySchema = z.object({
  targetKind: z.nativeEnum(ResourceKind),
  targetId: z.string().uuid(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(SHARES_PAGE_SIZE_MAX).default(SHARES_PAGE_SIZE_DEFAULT),
});

// Active grants only: a revoked one must never reappear in the owner's list
const sharesResponseSchema = z.object({
  items: z.array(shareSchema),
  nextCursor: z.string().nullable(),
});

const sharesContract = c.router({
  create: {
    method: 'POST',
    path: '/shares',
    summary: 'Share a data room, folder or file by public link or with a registered user',
    body: createShareSchema,
    responses: {
      // 200 is a grant that already existed, 201 one this request created
      200: createdShareSchema,
      201: createdShareSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      413: errorResponseSchema,
      // RECIPIENT_NOT_FOUND or SELF_SHARE_NOT_ALLOWED - the client branches on `code`
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  list: {
    method: 'GET',
    path: '/shares',
    summary: 'List the active grants on one resource, keyset-paginated',
    query: listSharesQuerySchema,
    responses: {
      200: sharesResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  revoke: {
    method: 'DELETE',
    path: '/shares/:shareId',
    summary: 'Revoke a grant; repeating the request is safe',
    pathParams: shareIdParamsSchema,
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
});

type CreateShare = z.infer<typeof createShareSchema>;
type CreatedShare = z.infer<typeof createdShareSchema>;
type ListSharesQuery = z.infer<typeof listSharesQuerySchema>;
type Share = z.infer<typeof shareSchema>;
type ShareTarget = z.infer<typeof shareTargetSchema>;
type ShareTargetView = z.infer<typeof shareTargetViewSchema>;
type SharesResponse = z.infer<typeof sharesResponseSchema>;

export {
  createdShareSchema,
  createShareSchema,
  listSharesQuerySchema,
  shareIdParamsSchema,
  shareSchema,
  sharesContract,
  sharesPageSize,
  sharesResponseSchema,
  shareTargetSchema,
  shareTargetViewSchema,
  type CreatedShare,
  type CreateShare,
  type ListSharesQuery,
  type Share,
  type SharesResponse,
  type ShareTarget,
  type ShareTargetView,
};
