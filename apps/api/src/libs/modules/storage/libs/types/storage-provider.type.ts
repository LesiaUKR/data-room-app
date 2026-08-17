/** What the application needs from object storage, with no vendor concepts in sight. */

type UploadUrlRequest = {
  /** Immutable `dataRoomId/fileId/versionId` — never a display name or a URL. */
  objectKey: string;
  contentType: string;
  maxSizeBytes: number;
};

/** Carries its own proof of permission: one object, one operation, until `expiresAt`. */
type SignedUrl = {
  url: string;
  expiresAt: Date;
};

type StoredObject = {
  objectKey: string;
  sizeBytes: number;
  contentType: string;
};

interface StorageProvider {
  createUploadUrl(request: UploadUrlRequest): Promise<SignedUrl>;
  createDownloadUrl(objectKey: string): Promise<SignedUrl>;
  head(objectKey: string): Promise<StoredObject>;
  deleteMany(objectKeys: string[]): Promise<void>;
}

export { type SignedUrl, type StorageProvider, type StoredObject, type UploadUrlRequest };
