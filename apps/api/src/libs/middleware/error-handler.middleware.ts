import { ErrorCode, type ErrorResponse } from '@data-room/contracts';
import { type NextFunction, type Request, type Response } from 'express';

import { HTTPHeader } from '../enums/index.js';
import { HTTPCode, HTTPError } from '../modules/http/index.js';
import { logger } from '../modules/logger/index.js';

const INTERNAL_ERROR_MESSAGE = 'Unexpected error. Quote the x-request-id header when reporting it.';
const MALFORMED_BODY_MESSAGE = 'Request body is not valid JSON.';
const BODY_TOO_LARGE_MESSAGE = 'Request body is too large.';
const JSON_PARSE_ERROR_TYPE = 'entity.parse.failed';
const BODY_TOO_LARGE_ERROR_TYPE = 'entity.too.large';

const getRequestId = (value: number | string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

// body-parser tags its own failures with `type`; a status it carries is never trusted directly
const isBodyParserError = (error: unknown, type: string): boolean =>
  error instanceof Error && 'type' in error && error.type === type;

const toBodyParserError = (error: unknown): HTTPError | null => {
  if (isBodyParserError(error, JSON_PARSE_ERROR_TYPE)) {
    return new HTTPError({
      code: ErrorCode.MALFORMED_REQUEST_BODY,
      message: MALFORMED_BODY_MESSAGE,
      status: HTTPCode.BAD_REQUEST,
    });
  }

  if (isBodyParserError(error, BODY_TOO_LARGE_ERROR_TYPE)) {
    return new HTTPError({
      code: ErrorCode.REQUEST_BODY_TOO_LARGE,
      message: BODY_TOO_LARGE_MESSAGE,
      status: HTTPCode.PAYLOAD_TOO_LARGE,
    });
  }

  return null;
};

function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const requestId = getRequestId(response.getHeader(HTTPHeader.REQUEST_ID));

  const normalizedError = toBodyParserError(error) ?? error;

  if (normalizedError instanceof HTTPError) {
    logger.warn(
      { requestId, code: normalizedError.code, status: normalizedError.status },
      normalizedError.message,
    );

    const body: ErrorResponse = {
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
      },
    };

    response.status(normalizedError.status).json(body);

    return;
  }

  logger.error({ requestId, err: error }, 'Unhandled error');

  const body: ErrorResponse = {
    error: { code: ErrorCode.INTERNAL_ERROR, message: INTERNAL_ERROR_MESSAGE },
  };

  response.status(HTTPCode.INTERNAL_SERVER_ERROR).json(body);
}

export { errorHandler };
