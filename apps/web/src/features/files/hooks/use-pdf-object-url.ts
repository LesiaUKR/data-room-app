import { uploadLimits } from '@data-room/contracts';
import { useEffect, useState } from 'react';

type PdfObjectUrlState = {
  objectUrl: string | null;
  hasFailed: boolean;
};

/**
 * Storage serves objects as attachments, so an iframe pointed at the signed URL downloads them
 * instead of rendering. Fetching the bytes and re-typing them into a local object URL is what
 * makes the browser display the PDF inline, because a blob: URL carries no HTTP headers.
 */
const usePdfObjectUrl = (signedUrl: string | null): PdfObjectUrlState => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setObjectUrl(null);
    setHasFailed(false);

    if (signedUrl === null) {
      return;
    }

    const controller = new AbortController();

    let createdUrl: string | null = null;
    let isCancelled = false;

    const load = async (): Promise<void> => {
      try {
        const response = await fetch(signedUrl, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Storage responded with ${response.status}`);
        }

        const stored = await response.blob();

        createdUrl = URL.createObjectURL(new Blob([stored], { type: uploadLimits.contentType }));

        if (isCancelled) {
          URL.revokeObjectURL(createdUrl);

          return;
        }

        setObjectUrl(createdUrl);
      } catch {
        if (!isCancelled) {
          setHasFailed(true);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
      controller.abort();

      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [signedUrl]);

  return { objectUrl, hasFailed };
};

export { usePdfObjectUrl };
