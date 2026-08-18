import { ErrorCode, ResourceKind } from '@data-room/contracts';

const resourceNotFound = {
  [ResourceKind.DATA_ROOM]: {
    code: ErrorCode.DATA_ROOM_NOT_FOUND,
    message: 'Data room not found.',
  },
  [ResourceKind.FOLDER]: {
    code: ErrorCode.FOLDER_NOT_FOUND,
    message: 'Folder not found.',
  },
  [ResourceKind.FILE]: {
    code: ErrorCode.FILE_NOT_FOUND,
    message: 'File not found.',
  },
} satisfies Record<ResourceKind, { code: ErrorCode; message: string }>;

export { resourceNotFound };
