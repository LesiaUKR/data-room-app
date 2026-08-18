import { type AccessDecision, GrantSource } from '../../../../libs/modules/access/index.js';
import { type FolderAncestor } from '../types/index.js';

// A folder share must not expose the names of the folders above it, so the chain starts at the
// shallowest granted folder. An owner and a room-wide grantee keep the whole chain.
const clampBreadcrumbs = (items: FolderAncestor[], decision: AccessDecision): FolderAncestor[] => {
  if (decision.evidence.length === 0) {
    return items;
  }

  if (decision.evidence.some((grant) => grant.source === GrantSource.DATA_ROOM)) {
    return items;
  }

  const grantedFolderIds = new Set(
    decision.evidence
      .map((grant) => grant.targetFolderId)
      .filter((id): id is string => id !== null),
  );

  // `items` is ordered by depth ascending, so the first match is the widest grant in the chain
  const shareRoot = items.find((item) => grantedFolderIds.has(item.id));

  return shareRoot === undefined ? items : items.filter((item) => item.depth >= shareRoot.depth);
};

export { clampBreadcrumbs };
