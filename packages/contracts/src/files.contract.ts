import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { FileVersionStatus, UploadMode } from './enums/index.js';
import { errorResponseSchema } from './error-response.schema.js';
import { byteCountSchema, resourceNameSchema } from './primitives.schema.js';

const c = initContract();

const PDF_CONTENT_TYPE = 'application/pdf';

// Bytes travel browser -> storage, so this bounds one document, not a request body
const UPLOAD_MAX_BYTES = 52_428_800;

const uploadLimits = {
  maxBytes: UPLOAD_MAX_BYTES,
  contentType: PDF_CONTENT_TYPE,
} as const;

const fileIdParamsSchema = z.object({
  fileId: z.string().uuid(),
});

const versionIdParamsSchema = z.object({
  versionId: z.string().uuid(),
});

/** The logical document. Rename and move never touch a version, so no version data lives here. */
const fileSchema = z.object({
  id: z.string().uuid(),
  folderId: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const signedUrlSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
});

const createUploadIntentSchema = z.object({
  folderId: z.string().uuid(),
  name: resourceNameSchema,
  // A declaration, not a guarantee: the stored object's real type is re-checked on completion
  contentType: z.literal(PDF_CONTENT_TYPE),
});

const uploadIntentSchema = z.object({
  mode: z.nativeEnum(UploadMode),
  fileId: z.string().uuid(),
  folderId: z.string().uuid(),
  versionId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  name: z.string(),
  upload: signedUrlSchema,
});

/** `isCurrent` is false when a newer version was promoted while this upload was in flight. */
const completedVersionSchema = z.object({
  fileId: z.string().uuid(),
  folderId: z.string().uuid(),
  versionId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  name: z.string(),
  sizeBytes: byteCountSchema,
  contentType: z.string(),
  status: z.literal(FileVersionStatus.READY),
  isCurrent: z.boolean(),
});

const renameFileSchema = z.object({
  name: resourceNameSchema,
});

const moveFileSchema = z.object({
  folderId: z.string().uuid(),
});

const filesContract = c.router({
  createUploadIntent: {
    method: 'POST',
    path: '/upload-intents',
    summary: 'Reserve a file version and return a signed URL the browser uploads to directly',
    body: createUploadIntentSchema,
    responses: {
      201: uploadIntentSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      413: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  completeUpload: {
    method: 'POST',
    path: '/file-versions/:versionId/complete',
    summary: 'Verify the uploaded object, mark the version READY and promote it if it is newer',
    pathParams: versionIdParamsSchema,
    // The version id created before the upload is the idempotency key; a body would add nothing
    body: c.noBody(),
    responses: {
      200: completedVersionSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      // INVALID_FILE_VERSION_STATE, UPLOAD_INCOMPLETE or UNSUPPORTED_FILE_TYPE
      409: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  getDownloadUrl: {
    method: 'GET',
    path: '/files/:fileId/download-url',
    summary: 'Mint a short-lived signed URL for the current READY version',
    pathParams: fileIdParamsSchema,
    responses: {
      200: signedUrlSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      // UPLOAD_INCOMPLETE: the document exists but has no READY version to serve
      409: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  rename: {
    method: 'PATCH',
    path: '/files/:fileId',
    summary: 'Rename the logical document within its folder',
    pathParams: fileIdParamsSchema,
    body: renameFileSchema,
    responses: {
      200: fileSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      413: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  move: {
    method: 'PATCH',
    path: '/files/:fileId/move',
    summary: 'Move the logical document to another folder of the same data room',
    pathParams: fileIdParamsSchema,
    body: moveFileSchema,
    responses: {
      200: fileSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      413: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  remove: {
    method: 'DELETE',
    path: '/files/:fileId',
    summary: 'Soft-delete the document and retire every version blob',
    pathParams: fileIdParamsSchema,
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

type CompletedVersion = z.infer<typeof completedVersionSchema>;
type CreateUploadIntent = z.infer<typeof createUploadIntentSchema>;
type DataRoomFile = z.infer<typeof fileSchema>;
type MoveFile = z.infer<typeof moveFileSchema>;
type RenameFile = z.infer<typeof renameFileSchema>;
type SignedUrlResponse = z.infer<typeof signedUrlSchema>;
type UploadIntent = z.infer<typeof uploadIntentSchema>;

export {
  completedVersionSchema,
  createUploadIntentSchema,
  fileIdParamsSchema,
  fileSchema,
  filesContract,
  moveFileSchema,
  renameFileSchema,
  signedUrlSchema,
  uploadIntentSchema,
  uploadLimits,
  versionIdParamsSchema,
  type CompletedVersion,
  type CreateUploadIntent,
  type DataRoomFile,
  type MoveFile,
  type RenameFile,
  type SignedUrlResponse,
  type UploadIntent,
};
