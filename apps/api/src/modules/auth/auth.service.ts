import { type Credentials, ErrorCode, type SessionResponse } from '@data-room/contracts';

import { type PasswordHasher, type TokenSigner } from '../../libs/modules/auth/index.js';
import { transaction } from '../../libs/modules/database/index.js';
import { HTTPCode } from '../../libs/modules/http/index.js';
import { type AuthRepository } from './auth.repository.js';
import { AuthErrorMessage } from './libs/enums/index.js';
import { AuthError } from './libs/exceptions/index.js';
import { type AuthResult, type UserAccount } from './libs/types/index.js';

const DEFAULT_DATA_ROOM_NAME = 'My Data Room';

// A real bcrypt hash of a random value: comparing against it keeps the "unknown email" path as
// slow as the "wrong password" path, so response time cannot reveal who is registered
const TIMING_DECOY_HASH = '$2b$12$5sObNBDnwEcqo6Db43lXv.xZDfu4VFZJ1U6Y6hw8gU35zo3F11c4G';

type AuthServiceParameters = {
  authRepository: AuthRepository;
  passwordHasher: PasswordHasher;
  tokenSigner: TokenSigner;
};

class AuthService {
  private readonly authRepository: AuthRepository;

  private readonly passwordHasher: PasswordHasher;

  private readonly tokenSigner: TokenSigner;

  public constructor({ authRepository, passwordHasher, tokenSigner }: AuthServiceParameters) {
    this.authRepository = authRepository;
    this.passwordHasher = passwordHasher;
    this.tokenSigner = tokenSigner;
  }

  public async signUp({ email, password }: Credentials): Promise<AuthResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.authRepository.findByEmail(normalizedEmail);

    if (existing) {
      throw this.emailInUseError();
    }

    const passwordHash = await this.passwordHasher.hash(password);

    const account = await transaction((tx) =>
      this.authRepository.createAccount(
        { email: normalizedEmail, passwordHash, dataRoomName: DEFAULT_DATA_ROOM_NAME },
        tx,
      ),
    );

    // The check above lost a race; the unique index is what actually guarantees one account
    if (!account) {
      throw this.emailInUseError();
    }

    return this.toAuthResult(account);
  }

  public async signIn({ email, password }: Credentials): Promise<AuthResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.authRepository.findByEmail(normalizedEmail);

    // Always compare, even with no user, so both failures cost the same time
    const passwordMatches = await this.passwordHasher.compare(
      password,
      user ? user.getPasswordHash() : TIMING_DECOY_HASH,
    );

    if (!user || !passwordMatches) {
      throw new AuthError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: AuthErrorMessage.INVALID_CREDENTIALS,
        status: HTTPCode.UNAUTHORIZED,
      });
    }

    return this.toAuthResult(await this.requireAccount(user.getId()));
  }

  /** Sharing needs the recipient's id; the MVP never invites an unregistered address. */
  public async findUserIdByEmail(email: string): Promise<string | null> {
    const user = await this.authRepository.findByEmail(this.normalizeEmail(email));

    return user?.getId() ?? null;
  }

  public async getSession(userId: string): Promise<SessionResponse> {
    return this.toSession(await this.requireAccount(userId));
  }

  private async requireAccount(userId: string): Promise<UserAccount> {
    const account = await this.authRepository.findAccountByUserId(userId);

    // A valid token whose user no longer exists is an unauthenticated request, not a 500
    if (!account) {
      throw new AuthError({
        code: ErrorCode.UNAUTHORIZED,
        message: AuthErrorMessage.SESSION_REQUIRED,
        status: HTTPCode.UNAUTHORIZED,
      });
    }

    return account;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private emailInUseError(): AuthError {
    return new AuthError({
      code: ErrorCode.EMAIL_ALREADY_IN_USE,
      message: AuthErrorMessage.EMAIL_ALREADY_IN_USE,
      status: HTTPCode.CONFLICT,
    });
  }

  private toSession(account: UserAccount): SessionResponse {
    return { user: account.user.toObject(), dataRoom: account.dataRoom };
  }

  private toAuthResult(account: UserAccount): AuthResult {
    return {
      token: this.tokenSigner.sign({ userId: account.user.getId() }),
      session: this.toSession(account),
    };
  }
}

export { AuthService, type AuthServiceParameters };
