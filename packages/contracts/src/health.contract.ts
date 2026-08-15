import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { errorResponseSchema } from './error-response.schema.js';

const c = initContract();

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  uptimeSeconds: z.number().nonnegative(),
});

type HealthResponse = z.infer<typeof healthResponseSchema>;

const healthContract = c.router({
  check: {
    method: 'GET',
    path: '/health',
    summary: 'Liveness probe for the API deployment',
    responses: {
      200: healthResponseSchema,
      500: errorResponseSchema,
    },
  },
});

export { healthContract, healthResponseSchema, type HealthResponse };
