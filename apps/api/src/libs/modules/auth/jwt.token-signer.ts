import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { type TokenPayload, type TokenSigner } from './libs/types/index.js';

const ALGORITHM = 'HS256';

// `sub` is the registered JWT claim for the subject; the domain name stays inside this adapter
const claimsSchema = z.object({ sub: z.string().uuid() });

class JwtTokenSigner implements TokenSigner {
  private readonly secret: string;

  private readonly ttlSeconds: number;

  public constructor({ secret, ttlSeconds }: { secret: string; ttlSeconds: number }) {
    this.secret = secret;
    this.ttlSeconds = ttlSeconds;
  }

  public sign(payload: TokenPayload): string {
    return jwt.sign({}, this.secret, {
      algorithm: ALGORITHM,
      subject: payload.userId,
      expiresIn: this.ttlSeconds,
    });
  }

  public verify(token: string): TokenPayload | null {
    try {
      // Pinning the algorithm blocks tokens that ask to be verified a different way
      const claims = jwt.verify(token, this.secret, { algorithms: [ALGORITHM] });
      const parsed = claimsSchema.safeParse(claims);

      return parsed.success ? { userId: parsed.data.sub } : null;
    } catch {
      // Library errors stay inside the adapter: the caller only ever sees "no valid session"
      return null;
    }
  }
}

export { JwtTokenSigner };
