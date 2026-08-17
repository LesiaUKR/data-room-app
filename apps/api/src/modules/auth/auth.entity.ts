import { type SessionUser } from '@data-room/contracts';

type UserEntityParameters = {
  id: string;
  email: string;
  passwordHash: string;
};

/**
 * Identity kept separate from the Prisma row, so `passwordHash` has exactly one way out:
 * a deliberate call to `getPasswordHash()`.
 */
class UserEntity {
  private readonly id: string;

  private readonly email: string;

  private readonly passwordHash: string;

  private constructor({ id, email, passwordHash }: UserEntityParameters) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
  }

  // No `initializeNew`: nothing here needs an unsaved user, and a nullable id would force a cast
  public static initialize(parameters: UserEntityParameters): UserEntity {
    return new UserEntity(parameters);
  }

  public getId(): string {
    return this.id;
  }

  public getPasswordHash(): string {
    return this.passwordHash;
  }

  public toObject(): SessionUser {
    return { id: this.id, email: this.email };
  }
}

export { UserEntity, type UserEntityParameters };
