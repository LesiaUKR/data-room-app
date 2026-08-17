import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { ContentsEntryKind } from './enums/index.js';
import { errorResponseSchema } from './error-response.schema.js';

const c = initContract();

// Characters, not code units: VARCHAR(255) counts characters and "😀".length is 2
const FOLDER_NAME_MAX_CHARACTERS = 255;

const CONTENTS_PAGE_SIZE_DEFAULT = 50;
const CONTENTS_PAGE_SIZE_MAX = 100;

// Allowlist: emoji, zero-width, bidi-control and <>:"/\|?* are excluded by not being listed
const ALLOWED_NAME_PATTERN = /^[\p{L}\p{M}\p{N}\p{Pd} _.,()[\]'’&]+$/u;

const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

const contentsPageSize = {
  default: CONTENTS_PAGE_SIZE_DEFAULT,
  max: CONTENTS_PAGE_SIZE_MAX,
} as const;

const countCharacters = (value: string): number => [...value].length;

const baseNameOf = (value: string): string => (value.split('.')[0] ?? '').toUpperCase();

const folderNameSchema = z
  .string()
  .trim()
  .transform((value) =>
    value
      .normalize('NFC')
      .replace(/\p{Zs}+/gu, ' ')
      .trim(),
  )
  .refine((value) => value.length > 0, { message: 'Name is required' })
  .refine((value) => countCharacters(value) <= FOLDER_NAME_MAX_CHARACTERS, {
    message: `Name cannot be longer than ${FOLDER_NAME_MAX_CHARACTERS} characters`,
  })
  .refine((value) => ALLOWED_NAME_PATTERN.test(value), {
    message:
      "Name may contain letters, digits, spaces and - _ . , ( ) [ ] ' & only - no emoji or invisible characters",
  })
  .refine((value) => !value.startsWith('.'), { message: 'Name cannot start with a dot' })
  .refine((value) => !value.endsWith('.'), { message: 'Name cannot end with a dot' })
  .refine((value) => !WINDOWS_RESERVED_NAMES.has(baseNameOf(value)), {
    message: 'This name is reserved by the operating system',
  });

// Decimal string: JSON.stringify throws on BigInt, and SUM(bigint) returns NUMERIC anyway
const byteCountSchema = z.string().regex(/^\d+$/);

const folderIdParamsSchema = z.object({
  folderId: z.string().uuid(),
});

// Non-null because create and rename never act on the root folder
const folderSchema = z.object({
  id: z.string().uuid(),
  parentFolderId: z.string().uuid(),
  name: z.string(),
  depth: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const createFolderSchema = z.object({
  parentFolderId: z.string().uuid(),
  name: folderNameSchema,
});

const renameFolderSchema = z.object({
  name: folderNameSchema,
});

const contentsFolderEntrySchema = z.object({
  kind: z.literal(ContentsEntryKind.FOLDER),
  id: z.string().uuid(),
  name: z.string(),
  updatedAt: z.string().datetime(),
});

const contentsFileEntrySchema = z.object({
  kind: z.literal(ContentsEntryKind.FILE),
  id: z.string().uuid(),
  name: z.string(),
  sizeBytes: byteCountSchema,
  contentType: z.string(),
  updatedAt: z.string().datetime(),
});

const contentsEntrySchema = z.discriminatedUnion('kind', [
  contentsFolderEntrySchema,
  contentsFileEntrySchema,
]);

const contentsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CONTENTS_PAGE_SIZE_MAX)
    .default(CONTENTS_PAGE_SIZE_DEFAULT),
});

const contentsResponseSchema = z.object({
  items: z.array(contentsEntrySchema),
  nextCursor: z.string().nullable(),
});

// Root folder excluded, so the chain is empty when the root itself is open
const breadcrumbSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  depth: z.number().int().positive(),
});

const breadcrumbsResponseSchema = z.object({
  items: z.array(breadcrumbSchema),
});

// Excludes the folder itself, and counts only current READY versions
const subtreeStatsSchema = z.object({
  folderCount: z.number().int().nonnegative(),
  fileCount: z.number().int().nonnegative(),
  totalBytes: byteCountSchema,
});

const foldersContract = c.router({
  create: {
    method: 'POST',
    path: '/folders',
    summary: 'Create a folder inside an existing folder of the actor data room',
    body: createFolderSchema,
    responses: {
      201: folderSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      // NAME_CONFLICT or FOLDER_DEPTH_LIMIT_EXCEEDED - the client branches on `code`
      409: errorResponseSchema,
      413: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  rename: {
    method: 'PATCH',
    path: '/folders/:folderId',
    summary: 'Rename a folder within its parent',
    pathParams: folderIdParamsSchema,
    body: renameFolderSchema,
    responses: {
      200: folderSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      // The internal root folder is readable but cannot be renamed
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
    path: '/folders/:folderId',
    summary: 'Soft-delete a folder together with its whole subtree',
    pathParams: folderIdParamsSchema,
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
  listContents: {
    method: 'GET',
    path: '/folders/:folderId/contents',
    summary: 'List direct child folders and files, folders first, keyset-paginated',
    pathParams: folderIdParamsSchema,
    query: contentsQuerySchema,
    responses: {
      200: contentsResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  listBreadcrumbs: {
    method: 'GET',
    path: '/folders/:folderId/breadcrumbs',
    summary: 'Ancestor chain of a folder, excluding the internal root folder',
    pathParams: folderIdParamsSchema,
    responses: {
      200: breadcrumbsResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  subtreeStats: {
    method: 'GET',
    path: '/folders/:folderId/subtree-stats',
    summary: 'Folder count, file count and total bytes of a whole subtree',
    pathParams: folderIdParamsSchema,
    responses: {
      200: subtreeStatsSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
});

type Folder = z.infer<typeof folderSchema>;
type CreateFolder = z.infer<typeof createFolderSchema>;
type RenameFolder = z.infer<typeof renameFolderSchema>;
type ContentsEntry = z.infer<typeof contentsEntrySchema>;
type ContentsFolderEntry = z.infer<typeof contentsFolderEntrySchema>;
type ContentsFileEntry = z.infer<typeof contentsFileEntrySchema>;
type ContentsQuery = z.infer<typeof contentsQuerySchema>;
type ContentsResponse = z.infer<typeof contentsResponseSchema>;
type Breadcrumb = z.infer<typeof breadcrumbSchema>;
type BreadcrumbsResponse = z.infer<typeof breadcrumbsResponseSchema>;
type SubtreeStats = z.infer<typeof subtreeStatsSchema>;

export {
  breadcrumbSchema,
  breadcrumbsResponseSchema,
  byteCountSchema,
  contentsEntrySchema,
  contentsPageSize,
  contentsQuerySchema,
  contentsResponseSchema,
  createFolderSchema,
  folderIdParamsSchema,
  folderNameSchema,
  foldersContract,
  folderSchema,
  renameFolderSchema,
  subtreeStatsSchema,
  type Breadcrumb,
  type BreadcrumbsResponse,
  type ContentsEntry,
  type ContentsFileEntry,
  type ContentsFolderEntry,
  type ContentsQuery,
  type ContentsResponse,
  type CreateFolder,
  type Folder,
  type RenameFolder,
  type SubtreeStats,
};
