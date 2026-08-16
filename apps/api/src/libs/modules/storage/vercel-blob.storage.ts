import { del, head, issueSignedToken, presignUrl } from '@vercel/blob';

import {
  type SignedUrl,
  type StorageProvider,
  type StoredObject,
  type UploadUrlRequest,
} from './libs/types/index.js';

const MILLISECONDS_PER_SECOND = 1000;

// Long enough for a slow connection to finish one file, short enough that a leaked URL dies
const UPLOAD_TTL_SECONDS = 600;

// A signed GET stays valid until it expires even if the share is revoked a second later.
// The mitigation is a short TTL, documented in the README — not a claim of instant revocation.
const DOWNLOAD_TTL_SECONDS = 120;

// Blob deletion is awaited in chunks after the catalog transaction, never fired and forgotten
const DELETE_CHUNK_SIZE = 100;

const ACCESS_MODE = 'private';

class VercelBlobStorage implements StorageProvider {
  private readonly token: string;

  public constructor({ token }: { token: string }) {
    this.token = token;
  }

  public async createUploadUrl(request: UploadUrlRequest): Promise<SignedUrl> {
    const validUntil = Date.now() + UPLOAD_TTL_SECONDS * MILLISECONDS_PER_SECOND;

    // Scoped to one pathname and one operation: this URL cannot read, delete, or touch
    // another object. The content-type and size hints are advisory — the storage HEAD check
    // on completion is what actually decides what lands in the database.
    const signedToken = await issueSignedToken({
      token: this.token,
      pathname: request.objectKey,
      operations: ['put'],
      validUntil,
      allowedContentTypes: [request.contentType],
      maximumSizeInBytes: request.maxSizeBytes,
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      access: ACCESS_MODE,
      operation: 'put',
      pathname: request.objectKey,
      validUntil,
    });

    return { url: presignedUrl, expiresAt: new Date(validUntil) };
  }

  public async createDownloadUrl(objectKey: string): Promise<SignedUrl> {
    const validUntil = Date.now() + DOWNLOAD_TTL_SECONDS * MILLISECONDS_PER_SECOND;

    const signedToken = await issueSignedToken({
      token: this.token,
      pathname: objectKey,
      operations: ['get'],
      validUntil,
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      access: ACCESS_MODE,
      operation: 'get',
      pathname: objectKey,
      validUntil,
    });

    return { url: presignedUrl, expiresAt: new Date(validUntil) };
  }

  public async head(objectKey: string): Promise<StoredObject> {
    const result = await head(objectKey, { token: this.token });

    return {
      objectKey: result.pathname,
      sizeBytes: result.size,
      contentType: result.contentType,
    };
  }

  public async deleteMany(objectKeys: string[]): Promise<void> {
    for (let index = 0; index < objectKeys.length; index += DELETE_CHUNK_SIZE) {
      const chunk = objectKeys.slice(index, index + DELETE_CHUNK_SIZE);

      await del(chunk, { token: this.token });
    }
  }
}

export { VercelBlobStorage };
