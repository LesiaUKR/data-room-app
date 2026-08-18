const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

const TRANSFER_FAILED_MESSAGE = 'The transfer to storage failed.';

/** Distinguishes a failed PUT to storage from a failed API call, which carries a coded body. */
class UploadTransferError extends Error {
  public constructor(message: string = TRANSFER_FAILED_MESSAGE) {
    super(message);
    this.name = 'UploadTransferError';
  }
}

type UploadToBlobOptions = {
  url: string;
  file: File;
  contentType: string;
  onProgress: (progress: number) => void;
};

/**
 * `fetch` reports no upload progress, so the one signed PUT in the app uses XMLHttpRequest.
 * The Content-Type sent here becomes the stored object's type, which completion re-checks.
 */
const uploadToBlob = ({ url, file, contentType, onProgress }: UploadToBlobOptions): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('PUT', url, true);
    request.setRequestHeader('Content-Type', contentType);

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total);
      }
    });

    request.addEventListener('load', () => {
      if (request.status >= HTTP_OK_MIN && request.status <= HTTP_OK_MAX) {
        onProgress(1);
        resolve();

        return;
      }

      reject(new UploadTransferError());
    });

    request.addEventListener('error', () => reject(new UploadTransferError()));
    request.addEventListener('timeout', () => reject(new UploadTransferError()));
    request.addEventListener('abort', () => reject(new UploadTransferError()));

    request.send(file);
  });

export { uploadToBlob, UploadTransferError };
