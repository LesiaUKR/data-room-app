import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { ShareRole } from './enums/index.js';
import { errorResponseSchema } from './error-response.schema.js';
import { fileDetailSchema, signedUrlSchema } from './files.contract.js';
import {
  breadcrumbsResponseSchema,
  contentsQuerySchema,
  contentsResponseSchema,
  folderIdParamsSchema,
} from './folders.contract.js';
import { shareTargetViewSchema } from './shares.contract.js';

const c = initContract();

const SHARE_TOKEN_MAX_LENGTH = 256;

// Over-long input is refused as 422; every real-shaped token - unknown, revoked or expired - gets the same 404
const shareTokenParamsSchema = z.object({
  token: z.string().min(1).max(SHARE_TOKEN_MAX_LENGTH),
});

const publicShareFolderParamsSchema = shareTokenParamsSchema.merge(folderIdParamsSchema);

const publicShareFileParamsSchema = shareTokenParamsSchema.extend({
  fileId: z.string().uuid(),
});

const publicShareSchema = z.object({
  target: shareTargetViewSchema,
  role: z.nativeEnum(ShareRole),
});

// 403 cannot occur while VIEWER holds every read action, but the error middleware owns the
// status and the contract must not narrow a range it does not control
const publicResponses = {
  403: errorResponseSchema,
  404: errorResponseSchema,
  422: errorResponseSchema,
  500: errorResponseSchema,
} as const;

const publicSharesContract = c.router({
  resolve: {
    method: 'GET',
    path: '/public/shares/:token',
    summary: 'Resolve a public link to the resource it grants read access to',
    pathParams: shareTokenParamsSchema,
    responses: {
      200: publicShareSchema,
      ...publicResponses,
    },
  },
  listContents: {
    method: 'GET',
    path: '/public/shares/:token/folders/:folderId/contents',
    summary: 'List a shared folder, or a folder inside the shared subtree',
    pathParams: publicShareFolderParamsSchema,
    query: contentsQuerySchema,
    responses: {
      200: contentsResponseSchema,
      ...publicResponses,
    },
  },
  listBreadcrumbs: {
    method: 'GET',
    path: '/public/shares/:token/folders/:folderId/breadcrumbs',
    summary: 'Ancestor chain clamped to the shared folder, never above it',
    pathParams: publicShareFolderParamsSchema,
    responses: {
      200: breadcrumbsResponseSchema,
      ...publicResponses,
    },
  },
  getFile: {
    method: 'GET',
    path: '/public/shares/:token/files/:fileId',
    summary: 'Read one shared document with the metadata of its current READY version',
    pathParams: publicShareFileParamsSchema,
    responses: {
      200: fileDetailSchema,
      // UPLOAD_INCOMPLETE: the document exists but has no READY version to describe
      409: errorResponseSchema,
      ...publicResponses,
    },
  },
  getDownloadUrl: {
    method: 'GET',
    path: '/public/shares/:token/files/:fileId/download-url',
    summary: 'Mint a short-lived signed URL for a shared document',
    pathParams: publicShareFileParamsSchema,
    responses: {
      200: signedUrlSchema,
      409: errorResponseSchema,
      ...publicResponses,
    },
  },
});

type PublicShare = z.infer<typeof publicShareSchema>;
type ShareTokenParams = z.infer<typeof shareTokenParamsSchema>;

export {
  publicShareSchema,
  publicSharesContract,
  shareTokenParamsSchema,
  type PublicShare,
  type ShareTokenParams,
};
