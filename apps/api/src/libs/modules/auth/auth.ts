import { config } from '../config/index.js';
import { BcryptPasswordHasher } from './bcrypt.password-hasher.js';
import { JwtTokenSigner } from './jwt.token-signer.js';

// OWASP asks for a minimum of 10; 12 keeps one hash near 300ms on the deployment's CPU
const PASSWORD_COST_FACTOR = 12;

const SECONDS_PER_DAY = 86_400;

// Shared by the token and the session cookie's maxAge, so the two cannot drift apart
const SESSION_TTL_SECONDS = 7 * SECONDS_PER_DAY;

const passwordHasher = new BcryptPasswordHasher({ costFactor: PASSWORD_COST_FACTOR });

const tokenSigner = new JwtTokenSigner({
  secret: config.jwtSecret,
  ttlSeconds: SESSION_TTL_SECONDS,
});

export { passwordHasher, SESSION_TTL_SECONDS, tokenSigner };
