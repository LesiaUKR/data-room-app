/**
 * Every protected operation the access policy can be asked about:
 * accessPolicy.require({ actor, action, resource }).
 *
 * Moving a file is not its own action on purpose — it requires FILE_UPDATE on the file and
 * FILE_CREATE on the target folder, so both ends of the operation are authorized.
 */
const Action = {
  DATA_ROOM_READ: 'data-room:read',

  FOLDER_READ: 'folder:read',
  FOLDER_CREATE: 'folder:create',
  FOLDER_UPDATE: 'folder:update',
  FOLDER_DELETE: 'folder:delete',

  FILE_READ: 'file:read',
  FILE_CREATE: 'file:create',
  FILE_UPDATE: 'file:update',
  FILE_DELETE: 'file:delete',

  SHARE_CREATE: 'share:create',
  SHARE_LIST: 'share:list',
  SHARE_REVOKE: 'share:revoke',
} as const;

type Action = (typeof Action)[keyof typeof Action];

export { Action };
