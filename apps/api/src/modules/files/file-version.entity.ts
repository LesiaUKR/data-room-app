import { FileVersionStatus } from '@data-room/contracts';

type FileVersionEntityParameters = {
  id: string;
  fileId: string;
  versionNumber: number;
  objectKey: string;
  sizeBytes: bigint | null;
  contentType: string | null;
  status: FileVersionStatus;
};

class FileVersionEntity {
  private readonly id: string;

  private readonly fileId: string;

  private readonly versionNumber: number;

  private readonly objectKey: string;

  private readonly sizeBytes: bigint | null;

  private readonly contentType: string | null;

  private readonly status: FileVersionStatus;

  private constructor({
    id,
    fileId,
    versionNumber,
    objectKey,
    sizeBytes,
    contentType,
    status,
  }: FileVersionEntityParameters) {
    this.id = id;
    this.fileId = fileId;
    this.versionNumber = versionNumber;
    this.objectKey = objectKey;
    this.sizeBytes = sizeBytes;
    this.contentType = contentType;
    this.status = status;
  }

  public static initialize(parameters: FileVersionEntityParameters): FileVersionEntity {
    return new FileVersionEntity(parameters);
  }

  public getId(): string {
    return this.id;
  }

  public getFileId(): string {
    return this.fileId;
  }

  public getVersionNumber(): number {
    return this.versionNumber;
  }

  public getObjectKey(): string {
    return this.objectKey;
  }

  public getStatus(): FileVersionStatus {
    return this.status;
  }

  public isPending(): boolean {
    return this.status === FileVersionStatus.PENDING;
  }

  public isReady(): boolean {
    return this.status === FileVersionStatus.READY;
  }

  /** BigInt throws inside JSON.stringify, so bytes cross every boundary as a decimal string. */
  public getSizeBytes(): string | null {
    return this.sizeBytes === null ? null : this.sizeBytes.toString();
  }

  public getContentType(): string | null {
    return this.contentType;
  }
}

export { FileVersionEntity, type FileVersionEntityParameters };
