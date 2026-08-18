import { createHash, randomBytes } from 'node:crypto';

import { ShareLimit } from '../enums/index.js';

const createShareToken = (): string => randomBytes(ShareLimit.TOKEN_BYTES).toString('base64url');

// The raw token exists only in the create response and the copied URL; the row keeps this
const hashShareToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

export { createShareToken, hashShareToken };
