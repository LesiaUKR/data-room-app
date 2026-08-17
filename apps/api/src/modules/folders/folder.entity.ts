import { type Folder } from '@data-room/contracts';

type FolderEntityParameters = {
  id: string;
  dataRoomId: string;
  parentFolderId: string | null;
  name: string;
  depth: number;
  createdAt: Date;
  updatedAt: Date;
};

const ROOT_HAS_NO_DTO_MESSAGE = 'The root folder is internal and has no DTO representation.';

class FolderEntity {
  private readonly id: string;

  private readonly dataRoomId: string;

  private readonly parentFolderId: string | null;

  private readonly name: string;

  private readonly depth: number;

  private readonly createdAt: Date;

  private readonly updatedAt: Date;

  private constructor({
    id,
    dataRoomId,
    parentFolderId,
    name,
    depth,
    createdAt,
    updatedAt,
  }: FolderEntityParameters) {
    this.id = id;
    this.dataRoomId = dataRoomId;
    this.parentFolderId = parentFolderId;
    this.name = name;
    this.depth = depth;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public static initialize(parameters: FolderEntityParameters): FolderEntity {
    return new FolderEntity(parameters);
  }

  public getId(): string {
    return this.id;
  }

  public getDataRoomId(): string {
    return this.dataRoomId;
  }

  public getParentFolderId(): string | null {
    return this.parentFolderId;
  }

  public getName(): string {
    return this.name;
  }

  public getDepth(): number {
    return this.depth;
  }

  public isRoot(): boolean {
    return this.parentFolderId === null;
  }

  public toObject(): Folder {
    // Reaching this on the root is a bug in our code, not a user error
    if (this.parentFolderId === null) {
      throw new Error(ROOT_HAS_NO_DTO_MESSAGE);
    }

    return {
      id: this.id,
      parentFolderId: this.parentFolderId,
      name: this.name,
      depth: this.depth,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}

export { FolderEntity, type FolderEntityParameters };
