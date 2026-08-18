import { PrincipalKind } from '../enums/index.js';
import { type Actor, type Principal } from '../types/index.js';

const toUserPrincipal = (actor: Actor): Principal => ({
  kind: PrincipalKind.USER,
  userId: actor.userId,
});

export { toUserPrincipal };
