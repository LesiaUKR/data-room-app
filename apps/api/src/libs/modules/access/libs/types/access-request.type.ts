import { type Action } from '@data-room/contracts';

import { type Principal } from '../../../../types/index.js';
import { type TransactionClient } from '../../../database/index.js';
import { type Resource } from './resource.type.js';

type AccessRequest = {
  // Nullable so a signed-out request fails closed in the policy, not at the call site
  principal: Principal | null;
  action: Action;
  resource: Resource;
  tx?: TransactionClient;
};

export { type AccessRequest };
