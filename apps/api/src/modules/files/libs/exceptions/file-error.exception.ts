import { HTTPError, type HTTPErrorParameters } from '../../../../libs/modules/http/index.js';

class FileError extends HTTPError {
  public constructor(parameters: HTTPErrorParameters) {
    super(parameters);

    this.name = 'FileError';
  }
}

export { FileError };
