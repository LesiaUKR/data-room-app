import {
  type Share,
  type ShareRole,
  type ShareTargetView,
  type ShareType,
} from '@data-room/contracts';

type ShareEntityParameters = {
  id: string;
  type: ShareType;
  role: ShareRole;
  recipientEmail: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

class ShareEntity {
  private readonly id: string;

  private readonly type: ShareType;

  private readonly role: ShareRole;

  private readonly recipientEmail: string | null;

  private readonly expiresAt: Date | null;

  private readonly revokedAt: Date | null;

  private readonly createdAt: Date;

  private constructor(parameters: ShareEntityParameters) {
    this.id = parameters.id;
    this.type = parameters.type;
    this.role = parameters.role;
    this.recipientEmail = parameters.recipientEmail;
    this.expiresAt = parameters.expiresAt;
    this.revokedAt = parameters.revokedAt;
    this.createdAt = parameters.createdAt;
  }

  public static initialize(parameters: ShareEntityParameters): ShareEntity {
    return new ShareEntity(parameters);
  }

  public getId(): string {
    return this.id;
  }

  public getRole(): ShareRole {
    return this.role;
  }

  // The partial unique index cannot see expires_at, so the regrant flow asks here instead
  public isExpired(now: Date): boolean {
    return this.expiresAt !== null && this.expiresAt <= now;
  }

  public isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  /** The target is passed in: one resource is listed at a time, so its name is resolved once. */
  public toObject(target: ShareTargetView): Share {
    return {
      id: this.id,
      type: this.type,
      role: this.role,
      target,
      recipientEmail: this.recipientEmail,
      createdAt: this.createdAt.toISOString(),
    };
  }
}

export { ShareEntity };
