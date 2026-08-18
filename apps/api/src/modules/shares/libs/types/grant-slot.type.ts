// The (recipient, target) pair the partial unique index guards
type GrantSlot = {
  dataRoomId: string;
  folderId: string | null;
  fileId: string | null;
  recipientUserId: string;
};

export { type GrantSlot };
