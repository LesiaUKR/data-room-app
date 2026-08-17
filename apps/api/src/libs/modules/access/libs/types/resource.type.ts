import { type ResourceKind } from '../enums/index.js';

type Resource = {
  kind: ResourceKind;
  dataRoomId: string;
  ownerId: string;
};

export { type Resource };
