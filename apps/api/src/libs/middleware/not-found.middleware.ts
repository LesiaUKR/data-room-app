import { ErrorCode } from '@data-room/contracts';
import { type NextFunction, type Request, type Response } from 'express';

import { HTTPCode, HTTPError } from '../modules/http/index.js';

const NOT_FOUND_MESSAGE = 'Route not found.';

function notFoundHandler(_request: Request, _response: Response, next: NextFunction): void {
  next(
    new HTTPError({
      code: ErrorCode.ROUTE_NOT_FOUND,
      message: NOT_FOUND_MESSAGE,
      status: HTTPCode.NOT_FOUND,
    }),
  );
}

export { notFoundHandler };
