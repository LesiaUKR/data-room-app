import { HTTPError, type HTTPErrorParameters } from '../../../../libs/modules/http/index.js';

class FolderError extends HTTPError {
  public constructor(parameters: HTTPErrorParameters) {
    super(parameters);

    this.name = 'FolderError';
  }
}

export { FolderError };
