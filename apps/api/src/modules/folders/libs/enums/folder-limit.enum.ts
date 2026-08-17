const FolderLimit = {
  MAX_DEPTH: 20,
  NAME_MAX_CHARACTERS: 255,
} as const;

type FolderLimit = (typeof FolderLimit)[keyof typeof FolderLimit];

export { FolderLimit };
