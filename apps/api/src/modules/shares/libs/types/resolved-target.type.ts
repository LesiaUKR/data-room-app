import { type ShareTargetView } from '@data-room/contracts';

import { type Resource } from '../../../../libs/modules/access/index.js';

// One resolve answers both questions: what the policy decides on, and what the client renders
type ResolvedTarget = {
  dataRoomId: string;
  folderId: string | null;
  fileId: string | null;
  resource: Resource;
  view: ShareTargetView;
};

export { type ResolvedTarget };
