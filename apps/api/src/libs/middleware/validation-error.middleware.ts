import { ErrorCode, type ErrorDetail } from '@data-room/contracts';
import { type RequestValidationError } from '@ts-rest/express';
import { type NextFunction, type Response } from 'express';
import { type ZodError } from 'zod';

import { HTTPCode, HTTPError } from '../modules/http/index.js';

const VALIDATION_ERROR_MESSAGE = 'Request validation failed.';

const toDetails = (source: string, error: ZodError | null): ErrorDetail[] =>
  error === null
    ? []
    : error.issues.map((issue) => ({
        path: [source, ...issue.path.map(String)].join('.'),
        message: issue.message,
      }));

function validationErrorHandler(
  error: RequestValidationError,
  _request: unknown,
  _response: Response,
  next: NextFunction,
): void {
  const details = [
    ...toDetails('params', error.pathParams),
    ...toDetails('headers', error.headers),
    ...toDetails('query', error.query),
    ...toDetails('body', error.body),
  ];

  next(
    new HTTPError({
      code: ErrorCode.VALIDATION_ERROR,
      details,
      message: VALIDATION_ERROR_MESSAGE,
      status: HTTPCode.UNPROCESSABLE_ENTITY,
    }),
  );
}

export { validationErrorHandler };
