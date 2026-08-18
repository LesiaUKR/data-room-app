import { type ShareRole, type ShareType } from '@data-room/contracts';

import { type GrantSource } from '../enums/index.js';

type GrantEvidence = {
  grantId: string;
  role: ShareRole;
  type: ShareType;
  source: GrantSource;
  dataRoomId: string;
  targetFolderId: string | null;
  targetFileId: string | null;
};

export { type GrantEvidence };
