const ResourceKind = {
  DATA_ROOM: 'DATA_ROOM',
  FOLDER: 'FOLDER',
  FILE: 'FILE',
} as const;

type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind];

export { ResourceKind };
