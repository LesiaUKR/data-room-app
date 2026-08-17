import { HTTPError, type HTTPErrorParameters } from '../../../../libs/modules/http/index.js';

/** Named so a stack trace points at this module; the middleware maps it like any HTTPError. */
class AuthError extends HTTPError {
  public constructor(parameters: HTTPErrorParameters) {
    super(parameters);

    this.name = 'AuthError';
  }
}

export { AuthError };
