const ContentsEntryKind = {
  FOLDER: 'folder',
  FILE: 'file',
} as const;

type ContentsEntryKind = (typeof ContentsEntryKind)[keyof typeof ContentsEntryKind];

export { ContentsEntryKind };
