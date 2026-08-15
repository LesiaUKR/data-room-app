import { randomUUID } from 'node:crypto';

import { type NextFunction, type Request, type Response } from 'express';

import { HTTPHeader } from '../enums/index.js';
import { logger } from '../modules/logger/index.js';

const UNMATCHED_ROUTE = 'unmatched';
const NS_IN_MS = 1_000_000;
const DURATION_PRECISION = 100;

const getRouteTemplate = (request: Request): string => {
  const route: unknown = request.route;

  if (
    typeof route === 'object' &&
    route !== null &&
    'path' in route &&
    typeof route.path === 'string'
  ) {
    return `${request.baseUrl}${route.path}`;
  }

  return request.baseUrl || UNMATCHED_ROUTE;
};

function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  response.setHeader(HTTPHeader.REQUEST_ID, requestId);

  response.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / NS_IN_MS;

    logger.info(
      {
        requestId,
        method: request.method,
        // The route template, never request.originalUrl: a public-link token travels in the path.
        route: getRouteTemplate(request),
        statusCode: response.statusCode,
        durationMs: Math.round(durationMs * DURATION_PRECISION) / DURATION_PRECISION,
      },
      'Response sent',
    );
  });

  next();
}

export { requestLogger };
