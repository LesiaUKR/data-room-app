type CreateFileRecord = {
  dataRoomId: string;
  folderId: string;
  name: string;
  normalizedName: string;
};

/** `id` is chosen by the caller because the object key embeds it and is NOT NULL. */
type CreateFileVersionRecord = {
  id: string;
  fileId: string;
  versionNumber: number;
  objectKey: string;
  createdById: string;
};

type RenameFileRecord = {
  fileId: string;
  name: string;
  normalizedName: string;
};

type MoveFileRecord = {
  fileId: string;
  folderId: string;
};

type FileNameLookup = {
  folderId: string;
  normalizedName: string;
};

/** Size and content type come from the storage HEAD check, never from the request. */
type CompleteVersionRecord = {
  versionId: string;
  sizeBytes: number;
  contentType: string;
};

type PromoteVersionRecord = {
  fileId: string;
  versionId: string;
  versionNumber: number;
};

export {
  type CompleteVersionRecord,
  type CreateFileRecord,
  type CreateFileVersionRecord,
  type FileNameLookup,
  type MoveFileRecord,
  type PromoteVersionRecord,
  type RenameFileRecord,
};
