import { FileLimit } from './file-limit.enum.js';

const FileErrorMessage = {
  NOT_FOUND: 'File not found.',
  VERSION_NOT_FOUND: 'File version not found.',
  FOLDER_NOT_FOUND: 'Folder not found.',
  NAME_TAKEN: 'A file with this name already exists here.',
  NAME_TOO_LONG: `Name cannot be longer than ${FileLimit.NAME_MAX_CHARACTERS} characters.`,
  NO_READY_VERSION: 'This file has no completed version yet.',
  UNSUPPORTED_CONTENT_TYPE: 'Only PDF files can be stored in a data room.',
  UPLOAD_INCOMPLETE: 'The uploaded file was not found in storage.',
  VERSION_ALLOCATION_FAILED: 'Could not allocate a version number for this upload.',
  VERSION_NOT_PENDING: 'This upload was already completed or cancelled.',
} as const;

type FileErrorMessage = (typeof FileErrorMessage)[keyof typeof FileErrorMessage];

export { FileErrorMessage };
