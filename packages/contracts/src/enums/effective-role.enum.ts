/**
 * Role the access policy resolved for one actor on one resource. OWNER is derived from
 * DataRoom.ownerId and is never stored as a grant, which is why ShareRole omits it.
 */
const EffectiveRole = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;

type EffectiveRole = (typeof EffectiveRole)[keyof typeof EffectiveRole];

export { EffectiveRole };
