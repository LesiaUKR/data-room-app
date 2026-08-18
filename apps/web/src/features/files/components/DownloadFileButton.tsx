import { Download, LoaderCircle } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';

const MINT_FAILED_MESSAGE = 'Download failed. Please try again.';

type DownloadFileButtonProperties = {
  fileName: string;
  objectUrl: string | null;
  canDownload: boolean;
  onRequestFreshUrl: () => Promise<string | null>;
};

/** A navigation, not a fetch: an attachment response downloads without leaving the page. */
const startDownload = (url: string): void => {
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.rel = 'noreferrer';

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

/**
 * Two paths. When the viewer holds the bytes, the anchor points at the local blob: URL and
 * `download` names the file — the attribute is honoured only for same-origin and blob: URLs.
 *
 * When the preview failed there are no bytes, so the signed URL is opened directly. It is minted
 * on the click rather than reused: it lives 120 seconds, and nothing refetches it while the page
 * sits open, so a held URL would be dead by the time anyone pressed the button.
 */
const DownloadFileButton = ({
  fileName,
  objectUrl,
  canDownload,
  onRequestFreshUrl,
}: DownloadFileButtonProperties): ReactElement | null => {
  const [isPreparing, setIsPreparing] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  if (objectUrl !== null) {
    return (
      <Button asChild variant="outline" size="lg">
        <a href={objectUrl} download={fileName}>
          <Download aria-hidden="true" />
          Download
        </a>
      </Button>
    );
  }

  if (!canDownload) {
    return null;
  }

  const handleClick = (): void => {
    setIsPreparing(true);
    setHasFailed(false);

    void onRequestFreshUrl()
      .then((url) => {
        if (url === null) {
          setHasFailed(true);

          return;
        }

        startDownload(url);
      })
      .catch(() => setHasFailed(true))
      .finally(() => setIsPreparing(false));
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={isPreparing}
        onClick={handleClick}
      >
        {isPreparing ? (
          <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Download aria-hidden="true" />
        )}
        {isPreparing ? 'Preparing…' : 'Download'}
      </Button>

      <div aria-live="polite">
        {hasFailed ? <p className="text-xs text-destructive">{MINT_FAILED_MESSAGE}</p> : null}
      </div>
    </div>
  );
};

export { DownloadFileButton };
