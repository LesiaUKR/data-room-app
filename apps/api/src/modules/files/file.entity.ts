import { type DataRoomFile } from '@data-room/contracts';

type FileEntityParameters = {
  id: string;
  dataRoomId: string;
  folderId: string;
  currentVersionId: string | null;
  name: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date;
};

class FileEntity {
  private readonly id: string;

  private readonly dataRoomId: string;

  private readonly folderId: string;

  private readonly currentVersionId: string | null;

  private readonly name: string;

  private readonly normalizedName: string;

  private readonly createdAt: Date;

  private readonly updatedAt: Date;

  private constructor({
    id,
    dataRoomId,
    folderId,
    currentVersionId,
    name,
    normalizedName,
    createdAt,
    updatedAt,
  }: FileEntityParameters) {
    this.id = id;
    this.dataRoomId = dataRoomId;
    this.folderId = folderId;
    this.currentVersionId = currentVersionId;
    this.name = name;
    this.normalizedName = normalizedName;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public static initialize(parameters: FileEntityParameters): FileEntity {
    return new FileEntity(parameters);
  }

  public getId(): string {
    return this.id;
  }

  public getDataRoomId(): string {
    return this.dataRoomId;
  }

  public getFolderId(): string {
    return this.folderId;
  }

  public getCurrentVersionId(): string | null {
    return this.currentVersionId;
  }

  public getName(): string {
    return this.name;
  }

  public getNormalizedName(): string {
    return this.normalizedName;
  }

  public isCurrentVersion(versionId: string): boolean {
    return this.currentVersionId === versionId;
  }

  public toObject(): DataRoomFile {
    return {
      id: this.id,
      folderId: this.folderId,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export { FileEntity, type FileEntityParameters };
