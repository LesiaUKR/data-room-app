import { type FolderEntity } from '../../folder.entity.js';

type FolderWithOwner = {
  folder: FolderEntity;
  ownerId: string;
};

export { type FolderWithOwner };
