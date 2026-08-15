/**
 * Role a share grant can carry. OWNER is never a grant — it is derived from DataRoom.ownerId
 * — so it is not part of this set. The MVP issues VIEWER only; EDITOR exists from the first
 * migration, which is what makes adding it later a policy change rather than a schema change.
 */
const ShareRole = {
  VIEWER: 'VIEWER',
  EDITOR: 'EDITOR',
} as const;

type ShareRole = (typeof ShareRole)[keyof typeof ShareRole];

export { ShareRole };
