import bcrypt from 'bcryptjs';

import { type PasswordHasher } from './libs/types/index.js';

class BcryptPasswordHasher implements PasswordHasher {
  private readonly costFactor: number;

  public constructor({ costFactor }: { costFactor: number }) {
    this.costFactor = costFactor;
  }

  public async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.costFactor);
  }

  public async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}

export { BcryptPasswordHasher };
