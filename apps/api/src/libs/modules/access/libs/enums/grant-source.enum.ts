const GrantSource = {
  DATA_ROOM: 'DATA_ROOM',
  ANCESTOR_FOLDER: 'ANCESTOR_FOLDER',
  DIRECT_FOLDER: 'DIRECT_FOLDER',
  DIRECT_FILE: 'DIRECT_FILE',
} as const;

type GrantSource = (typeof GrantSource)[keyof typeof GrantSource];

export { GrantSource };
