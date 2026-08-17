import { Action, EffectiveRole } from '@data-room/contracts';

// The MVP never issues EDITOR; its row exists so adding the role stays a change to this table
const actionMatrix: Record<EffectiveRole, readonly Action[]> = {
  [EffectiveRole.OWNER]: [
    Action.DATA_ROOM_READ,
    Action.FOLDER_READ,
    Action.FOLDER_CREATE,
    Action.FOLDER_UPDATE,
    Action.FOLDER_DELETE,
    Action.FILE_READ,
    Action.FILE_CREATE,
    Action.FILE_UPDATE,
    Action.FILE_DELETE,
    Action.SHARE_CREATE,
    Action.SHARE_LIST,
    Action.SHARE_REVOKE,
  ],
  [EffectiveRole.EDITOR]: [
    Action.DATA_ROOM_READ,
    Action.FOLDER_READ,
    Action.FOLDER_CREATE,
    Action.FOLDER_UPDATE,
    Action.FOLDER_DELETE,
    Action.FILE_READ,
    Action.FILE_CREATE,
    Action.FILE_UPDATE,
    Action.FILE_DELETE,
  ],
  [EffectiveRole.VIEWER]: [Action.DATA_ROOM_READ, Action.FOLDER_READ, Action.FILE_READ],
};

export { actionMatrix };
