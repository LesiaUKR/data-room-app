import { type ShareEntity } from '../../share.entity.js';

type SharesPage = {
  items: ShareEntity[];
  lastId: string | null;
};

export { type SharesPage };
