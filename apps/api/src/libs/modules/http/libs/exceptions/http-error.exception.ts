import { type ErrorCode, type ErrorDetail } from '@data-room/contracts';

import { type HTTPCode } from '../enums/index.js';

type HTTPErrorParameters = {
  code: ErrorCode;
  details?: ErrorDetail[];
  message: string;
  status: HTTPCode;
};

class HTTPError extends Error {
  public readonly code: ErrorCode;
  public readonly details: ErrorDetail[] | undefined;
  public readonly status: HTTPCode;

  public constructor({ code, details, message, status }: HTTPErrorParameters) {
    super(message);

    this.name = 'HTTPError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export { HTTPError, type HTTPErrorParameters };
