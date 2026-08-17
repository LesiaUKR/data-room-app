import { type UserEntity } from '../../auth.entity.js';

/** What the repository hands back: the identity plus the room a session must point at. */
type UserAccount = {
  user: UserEntity;
  dataRoom: {
    id: string;
    name: string;
    rootFolderId: string;
  };
};

type CreateAccountInput = {
  email: string;
  passwordHash: string;
  dataRoomName: string;
};

export { type CreateAccountInput, type UserAccount };
