import { ErrorCode } from '@data-room/contracts';
import { type NextFunction, type Request, type Response } from 'express';

import { readSessionToken, tokenSigner } from '../modules/auth/index.js';
import { HTTPCode, HTTPError } from '../modules/http/index.js';
import { type Actor } from '../types/index.js';

const UNAUTHORIZED_MESSAGE = 'Authentication is required.';

// Structural rather than express.Request: ts-rest narrows req.query per route, and a narrowed
// request is no longer assignable to Request
type ActorRequest = Pick<Request, 'headers'> & { actor?: Actor };

const unauthorizedError = (): HTTPError =>
  new HTTPError({
    code: ErrorCode.UNAUTHORIZED,
    message: UNAUTHORIZED_MESSAGE,
    status: HTTPCode.UNAUTHORIZED,
  });

function authenticate(request: ActorRequest, _response: Response, next: NextFunction): void {
  const token = readSessionToken(request.headers.cookie);
  const payload = token === null ? null : tokenSigner.verify(token);

  if (payload === null) {
    next(unauthorizedError());

    return;
  }

  request.actor = { userId: payload.userId };

  next();
}

const getActor = (request: Pick<ActorRequest, 'actor'>): Actor => {
  if (!request.actor) {
    throw unauthorizedError();
  }

  return request.actor;
};

export { authenticate, getActor };
