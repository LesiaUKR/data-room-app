import { type ShareEntity } from '../../share.entity.js';

type ShareGrantTarget = {
  share: ShareEntity;
  dataRoomId: string;
  folderId: string | null;
  fileId: string | null;
};

export { type ShareGrantTarget };
