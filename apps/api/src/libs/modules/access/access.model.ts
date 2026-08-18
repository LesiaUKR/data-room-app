import { ShareRole, ShareType } from '@data-room/contracts';
import { z } from 'zod';

import { GrantSource } from './libs/enums/index.js';

const grantEvidenceRowsSchema = z.array(
  z.object({
    grantId: z.string().uuid(),
    role: z.nativeEnum(ShareRole),
    type: z.nativeEnum(ShareType),
    source: z.nativeEnum(GrantSource),
    dataRoomId: z.string().uuid(),
    targetFolderId: z.string().uuid().nullable(),
    targetFileId: z.string().uuid().nullable(),
  }),
);

export { grantEvidenceRowsSchema };
