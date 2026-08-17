type TokenPayload = {
  userId: string;
};

interface TokenSigner {
  sign(payload: TokenPayload): string;
  /** `null` for every rejection: expired, forged, malformed, or an unexpected payload shape. */
  verify(token: string): TokenPayload | null;
}

export { type TokenPayload, type TokenSigner };
