import { type FileVersionEntity } from '../../file-version.entity.js';
import { type FileEntity } from '../../file.entity.js';

type FileWithOwner = {
  file: FileEntity;
  ownerId: string;
};

type FileVersionWithFile = FileWithOwner & {
  version: FileVersionEntity;
};

export { type FileVersionWithFile, type FileWithOwner };
