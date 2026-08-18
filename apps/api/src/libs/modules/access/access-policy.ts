import { EffectiveRole, ErrorCode, ResourceKind, ShareRole } from '@data-room/contracts';

import { PrincipalKind } from '../../enums/index.js';
import { type Principal } from '../../types/index.js';
import { type TransactionClient } from '../database/index.js';
import { HTTPCode } from '../http/index.js';
import { type AccessRepository } from './access.repository.js';
import { AccessErrorMessage, actionMatrix, resourceNotFound } from './libs/enums/index.js';
import { AccessError } from './libs/exceptions/index.js';
import { type AccessDecision, type AccessRequest, type Resource } from './libs/types/index.js';

const grantRole = {
  [ShareRole.VIEWER]: EffectiveRole.VIEWER,
  [ShareRole.EDITOR]: EffectiveRole.EDITOR,
} satisfies Record<ShareRole, EffectiveRole>;

const roleRank = {
  [EffectiveRole.OWNER]: 0,
  [EffectiveRole.EDITOR]: 1,
  [EffectiveRole.VIEWER]: 2,
} satisfies Record<EffectiveRole, number>;

type ResolveRequest = {
  principal: Principal | null;
  resource: Resource;
  tx: TransactionClient | undefined;
};

type AccessPolicyParameters = {
  accessRepository: AccessRepository;
};

class AccessPolicy {
  private readonly accessRepository: AccessRepository;

  public constructor({ accessRepository }: AccessPolicyParameters) {
    this.accessRepository = accessRepository;
  }

  public async require({
    principal,
    action,
    resource,
    tx,
  }: AccessRequest): Promise<AccessDecision> {
    const decision = await this.resolve({ principal, resource, tx });

    // Invisible and non-existent answer identically; a 403 here would confirm the resource
    if (decision === null) {
      const { code, message } = resourceNotFound[resource.kind];

      throw new AccessError({ code, message, status: HTTPCode.NOT_FOUND });
    }

    if (!actionMatrix[decision.role].includes(action)) {
      throw new AccessError({
        code: ErrorCode.FORBIDDEN,
        message: AccessErrorMessage.ACTION_NOT_ALLOWED,
        status: HTTPCode.FORBIDDEN,
      });
    }

    return decision;
  }

  private async resolve({
    principal,
    resource,
    tx,
  }: ResolveRequest): Promise<AccessDecision | null> {
    if (principal === null) {
      return null;
    }

    if (principal.kind === PrincipalKind.USER && resource.ownerId === principal.userId) {
      return { role: EffectiveRole.OWNER, evidence: [] };
    }

    const found = await this.accessRepository.findActiveGrants({
      dataRoomId: resource.dataRoomId,
      folderId: resource.kind === ResourceKind.DATA_ROOM ? null : resource.folderId,
      fileId: resource.kind === ResourceKind.FILE ? resource.fileId : null,
      userId: principal.kind === PrincipalKind.USER ? principal.userId : null,
      tokenHash: principal.kind === PrincipalKind.PUBLIC_LINK ? principal.tokenHash : null,
      tx,
    });

    // Defence in depth on top of the room-scoped composite foreign keys
    const evidence = found.filter((grant) => grant.dataRoomId === resource.dataRoomId);

    // Every row came from one principal's predicate, so this ranks grants, never merges actors
    const role = evidence.reduce<EffectiveRole | null>((strongest, grant) => {
      const candidate = grantRole[grant.role];

      return strongest === null || roleRank[candidate] < roleRank[strongest]
        ? candidate
        : strongest;
    }, null);

    return role === null ? null : { role, evidence };
  }
}

export { AccessPolicy };
