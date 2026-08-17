import { type ContentsFileEntry, type ContentsFolderEntry } from '@data-room/contracts';

import { type FolderCursor } from '../helpers/index.js';

// The contract entries with a Date instead of an ISO string; the service formats it
type FolderContentsEntry =
  | (Omit<ContentsFolderEntry, 'updatedAt'> & { updatedAt: Date })
  | (Omit<ContentsFileEntry, 'updatedAt'> & { updatedAt: Date });

type FolderContentsPage = {
  entries: FolderContentsEntry[];
  nextCursor: string | null;
};

type ListContentsInput = {
  dataRoomId: string;
  folderId: string;
  limit: number;
  position: FolderCursor;
};

type FolderSubtreeStats = {
  folderCount: number;
  fileCount: number;
  totalBytes: string;
};

export {
  type FolderContentsEntry,
  type FolderContentsPage,
  type FolderSubtreeStats,
  type ListContentsInput,
};
