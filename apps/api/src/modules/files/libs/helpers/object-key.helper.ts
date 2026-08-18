const OBJECT_KEY_SEPARATOR = '/';

type ObjectKeyParts = {
  dataRoomId: string;
  fileId: string;
  versionId: string;
};

/** Built from ids only, so renaming or moving the document never touches stored bytes. */
const buildObjectKey = ({ dataRoomId, fileId, versionId }: ObjectKeyParts): string =>
  [dataRoomId, fileId, versionId].join(OBJECT_KEY_SEPARATOR);

export { buildObjectKey };
