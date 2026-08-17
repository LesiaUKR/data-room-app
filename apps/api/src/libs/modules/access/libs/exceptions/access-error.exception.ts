import { HTTPError, type HTTPErrorParameters } from '../../../http/index.js';

class AccessError extends HTTPError {
  public constructor(parameters: HTTPErrorParameters) {
    super(parameters);

    this.name = 'AccessError';
  }
}

export { AccessError };
