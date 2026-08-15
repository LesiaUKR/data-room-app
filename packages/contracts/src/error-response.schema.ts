import { z } from 'zod';

import { ErrorCode } from './enums/index.js';

const errorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

const errorResponseSchema = z.object({
  error: z.object({
    code: z.nativeEnum(ErrorCode),
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});

type ErrorDetail = z.infer<typeof errorDetailSchema>;
type ErrorResponse = z.infer<typeof errorResponseSchema>;

export { errorDetailSchema, errorResponseSchema, type ErrorDetail, type ErrorResponse };
