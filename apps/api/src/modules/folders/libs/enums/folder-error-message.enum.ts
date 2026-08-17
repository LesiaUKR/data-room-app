import { FolderLimit } from './folder-limit.enum.js';

const FolderErrorMessage = {
  INVALID_CURSOR: 'The list cursor is not valid for this folder.',
  NOT_FOUND: 'Folder not found.',
  NAME_TAKEN: 'A folder with this name already exists here.',
  NAME_TOO_LONG: `Name cannot be longer than ${FolderLimit.NAME_MAX_CHARACTERS} characters.`,
  ROOT_IMMUTABLE: 'The data room root folder cannot be renamed or deleted.',
  DEPTH_LIMIT_EXCEEDED: `Folders cannot be nested more than ${FolderLimit.MAX_DEPTH} levels deep.`,
} as const;

type FolderErrorMessage = (typeof FolderErrorMessage)[keyof typeof FolderErrorMessage];

export { FolderErrorMessage };
