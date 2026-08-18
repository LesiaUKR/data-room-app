import { HTTPError, type HTTPErrorParameters } from '../../../../libs/modules/http/index.js';

class ShareError extends HTTPError {
  public constructor(parameters: HTTPErrorParameters) {
    super(parameters);

    this.name = 'ShareError';
  }
}

export { ShareError };
