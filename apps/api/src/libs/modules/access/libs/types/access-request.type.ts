import { type Action } from '@data-room/contracts';

import { type Actor } from '../../../../types/index.js';
import { type Resource } from './resource.type.js';

// Nullable so a signed-out request fails closed in the policy, not at the call site
type AccessRequest = {
  actor: Actor | null;
  action: Action;
  resource: Resource;
};

export { type AccessRequest };
