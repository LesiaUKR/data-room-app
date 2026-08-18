type ListSharesInput = {
  dataRoomId: string;
  folderId: string | null;
  fileId: string | null;
  cursorId: string | null;
  limit: number;
};

export { type ListSharesInput };
