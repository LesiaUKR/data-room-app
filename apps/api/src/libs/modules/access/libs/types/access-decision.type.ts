import { type EffectiveRole } from '@data-room/contracts';

import { type GrantEvidence } from './grant-evidence.type.js';

// Evidence travels with the role so a caller that must clamp to the share root - public
// breadcrumbs - needs no second query. Empty for an owner, whose role is not a grant.
type AccessDecision = {
  role: EffectiveRole;
  evidence: GrantEvidence[];
};

export { type AccessDecision };
