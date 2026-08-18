import { type ResourceKind } from '@data-room/contracts';

type ResourceBase = {
  dataRoomId: string;
  ownerId: string;
};

// The ids are where the ancestor walk starts: a grant on any folder above a file authorizes it
type Resource =
  | (ResourceBase & { kind: typeof ResourceKind.DATA_ROOM })
  | (ResourceBase & { kind: typeof ResourceKind.FOLDER; folderId: string })
  | (ResourceBase & { kind: typeof ResourceKind.FILE; fileId: string; folderId: string });

export { type Resource };
