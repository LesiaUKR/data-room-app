// 32 bytes of entropy; sha-256 hex is exactly the 64 characters token_hash holds
const ShareLimit = {
  TOKEN_BYTES: 32,
  // A P2002 means either a concurrent user grant or a token-hash collision; both are retryable
  CREATE_ATTEMPTS: 3,
} as const;

export { ShareLimit };
