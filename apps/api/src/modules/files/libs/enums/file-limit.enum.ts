import { RESOURCE_NAME_MAX_CHARACTERS } from '@data-room/contracts';

const FileLimit = {
  NAME_MAX_CHARACTERS: RESOURCE_NAME_MAX_CHARACTERS,
  // A P2002 on (file_id, version_number) means two intents raced past the room lock
  VERSION_ALLOCATION_ATTEMPTS: 3,
} as const;

type FileLimit = (typeof FileLimit)[keyof typeof FileLimit];

export { FileLimit };
