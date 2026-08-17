type CreateFolderRecord = {
  dataRoomId: string;
  parentFolderId: string;
  name: string;
  normalizedName: string;
  depth: number;
};

type RenameFolderRecord = {
  folderId: string;
  name: string;
  normalizedName: string;
};

type FolderNameLookup = {
  parentFolderId: string;
  normalizedName: string;
};

export { type CreateFolderRecord, type FolderNameLookup, type RenameFolderRecord };
