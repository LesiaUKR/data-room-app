import { EffectiveRole, ErrorCode } from '@data-room/contracts';

import { type Actor } from '../../types/index.js';
import { HTTPCode } from '../http/index.js';
import { AccessErrorMessage, actionMatrix, resourceNotFound } from './libs/enums/index.js';
import { AccessError } from './libs/exceptions/index.js';
import { type AccessRequest, type Resource } from './libs/types/index.js';

type RoleRequest = {
  actor: Actor | null;
  resource: Resource;
};

class AccessPolicy {
  public require({ actor, action, resource }: AccessRequest): EffectiveRole {
    const role = this.resolveRole({ actor, resource });

    // Invisible and non-existent answer identically; a 403 here would confirm the resource
    if (role === null) {
      const { code, message } = resourceNotFound[resource.kind];

      throw new AccessError({ code, message, status: HTTPCode.NOT_FOUND });
    }

    if (!actionMatrix[role].includes(action)) {
      throw new AccessError({
        code: ErrorCode.FORBIDDEN,
        message: AccessErrorMessage.ACTION_NOT_ALLOWED,
        status: HTTPCode.FORBIDDEN,
      });
    }

    return role;
  }

  private resolveRole({ actor, resource }: RoleRequest): EffectiveRole | null {
    if (actor === null) {
      return null;
    }

    if (resource.ownerId === actor.userId) {
      return EffectiveRole.OWNER;
    }

    return null;
  }
}

export { AccessPolicy };
