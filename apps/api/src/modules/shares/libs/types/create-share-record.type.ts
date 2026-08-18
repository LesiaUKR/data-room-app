import { type ShareType } from '@data-room/contracts';

type CreateShareRecord = {
  dataRoomId: string;
  folderId: string | null;
  fileId: string | null;
  type: ShareType;
  tokenHash: string | null;
  recipientUserId: string | null;
  createdById: string;
};

export { type CreateShareRecord };
