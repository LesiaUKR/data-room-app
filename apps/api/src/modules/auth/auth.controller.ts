import { type Credentials, type SessionResponse } from '@data-room/contracts';
import { type Response } from 'express';

import {
  clearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '../../libs/modules/auth/index.js';
import { HTTPCode } from '../../libs/modules/http/index.js';
import { type Actor } from '../../libs/types/index.js';
import { type AuthService } from './auth.service.js';

type AuthControllerParameters = {
  authService: AuthService;
};

type CredentialsRequest = {
  body: Credentials;
  response: Response;
};

type SignUpResult = { status: typeof HTTPCode.CREATED; body: SessionResponse };
type SignInResult = { status: typeof HTTPCode.OK; body: SessionResponse };
type SignOutResult = { status: typeof HTTPCode.NO_CONTENT; body: undefined };
type SessionResult = { status: typeof HTTPCode.OK; body: SessionResponse };

class AuthController {
  private readonly authService: AuthService;

  public constructor({ authService }: AuthControllerParameters) {
    this.authService = authService;
  }

  public async signUp({ body, response }: CredentialsRequest): Promise<SignUpResult> {
    const { token, session } = await this.authService.signUp(body);

    response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return { status: HTTPCode.CREATED, body: session };
  }

  public async signIn({ body, response }: CredentialsRequest): Promise<SignInResult> {
    const { token, session } = await this.authService.signIn(body);

    response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return { status: HTTPCode.OK, body: session };
  }

  // Nothing to await: clearing a cookie is synchronous, but the router expects a promise
  public signOut({ response }: { response: Response }): Promise<SignOutResult> {
    response.clearCookie(SESSION_COOKIE_NAME, clearedSessionCookieOptions);

    return Promise.resolve({ status: HTTPCode.NO_CONTENT, body: undefined });
  }

  public async getSession({ actor }: { actor: Actor }): Promise<SessionResult> {
    const session = await this.authService.getSession(actor.userId);

    return { status: HTTPCode.OK, body: session };
  }
}

export { AuthController, type AuthControllerParameters };
