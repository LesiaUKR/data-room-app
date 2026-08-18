import { type PrincipalKind } from '../enums/index.js';

// The route decides which variant is built - a protected route never reads a token, a public
// route never reads the cookie - so two independent grants cannot combine into one role
type Principal =
  | { kind: typeof PrincipalKind.USER; userId: string }
  | { kind: typeof PrincipalKind.PUBLIC_LINK; tokenHash: string };

export { type Principal };
