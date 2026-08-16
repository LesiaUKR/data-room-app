/** What the application needs from object storage, with no vendor concepts in sight. */

/** What the service asks for. Nothing is signed yet at this point. */
type UploadUrlRequest = {
  /** Immutable `dataRoomId/fileId/versionId` — never a display name or a URL. */
  objectKey: string;
  contentType: string;
  maxSizeBytes: number;
};

/**
 * A URL carrying its own proof of permission: it is scoped to one object and one operation,
 * and stops working at `expiresAt`. Whoever holds it may act, so the lifetime stays short.
 */
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
