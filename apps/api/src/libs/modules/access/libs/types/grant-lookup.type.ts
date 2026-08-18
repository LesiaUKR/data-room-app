import { type TransactionClient } from '../../../database/index.js';

// Exactly one of userId/tokenHash is set; the other stays null and its SQL branch is inert
type GrantLookup = {
  dataRoomId: string;
  folderId: string | null;
  fileId: string | null;
  userId: string | null;
  tokenHash: string | null;
  tx?: TransactionClient;
};

export { type GrantLookup };
