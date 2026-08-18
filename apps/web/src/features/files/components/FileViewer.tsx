import { type FileDetail } from '@data-room/contracts';
import { LoaderCircle } from 'lucide-react';
import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks';
import { formatBytes } from '@/lib/format-bytes';

import { usePdfObjectUrl } from '../hooks/use-pdf-object-url';
import { DownloadFileButton } from './DownloadFileButton';

const APP_TITLE = 'Data Room';

const PREVIEW_FAILED_MESSAGE =
  'This document could not be shown here. Use Download to open it with another application.';

type DownloadState =
  | { status: 'pending' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; signedUrl: string };

// A download state cannot exist without a document, so it lives inside the ready variant
type FileViewState =
  | { status: 'pending' }
  | { status: 'failed'; message: string; onRetry?: () => void }
  | {
      status: 'ready';
      detail: FileDetail;
      download: DownloadState;
      onRetryDownload: () => void;
      requestFreshUrl: () => Promise<string | null>;
    };

type FileViewerProperties = {
  file: FileViewState;
  back?: ReactNode;
};

/**
 * Renders one document from an already-resolved view model. It never names an endpoint, so the
 * same screen serves an authenticated reader and a public link.
 */
const FileViewer = ({ file, back }: FileViewerProperties): ReactElement => {
  const signedUrl =
    file.status === 'ready' && file.download.status === 'ready' ? file.download.signedUrl : null;

  const { objectUrl, hasFailed } = usePdfObjectUrl(signedUrl);

  useDocumentTitle(file.status === 'ready' ? `${file.detail.name} — ${APP_TITLE}` : APP_TITLE);

  if (file.status === 'pending') {
    return (
      <ViewerShell back={back}>
        <ViewerState>
          <LoaderCircle
            className="size-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p>Opening the document…</p>
        </ViewerState>
      </ViewerShell>
    );
  }

  if (file.status === 'failed') {
    return (
      <ViewerShell back={back}>
        <ViewerState>
          <p>{file.message}</p>

          {file.onRetry === undefined ? null : (
            <Button type="button" variant="outline" size="sm" onClick={file.onRetry}>
              Try again
            </Button>
          )}
        </ViewerState>
      </ViewerShell>
    );
  }

  const { detail, download, onRetryDownload, requestFreshUrl } = file;

  // The bytes are fetched and re-typed locally, so a ready URL is not yet a ready preview
  const isConverting = download.status === 'ready' && objectUrl === null && !hasFailed;

  return (
    <ViewerShell
      back={back}
      name={detail.name}
      meta={`${formatBytes(detail.sizeBytes)} · version ${detail.versionNumber}`}
      actions={
        <DownloadFileButton
          fileName={detail.name}
          objectUrl={objectUrl}
          canDownload={download.status === 'ready'}
          onRequestFreshUrl={requestFreshUrl}
        />
      }
    >
      {download.status === 'pending' || isConverting ? (
        <ViewerState>
          <LoaderCircle
            className="size-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p>Loading the document…</p>
        </ViewerState>
      ) : null}

      {download.status === 'failed' ? (
        <ViewerState>
          <p>{download.message}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetryDownload}>
            Try again
          </Button>
        </ViewerState>
      ) : null}

      {hasFailed && download.status !== 'failed' ? (
        <ViewerState>
          <p>{PREVIEW_FAILED_MESSAGE}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetryDownload}>
            Try again
          </Button>
        </ViewerState>
      ) : null}

      {objectUrl === null ? null : (
        <iframe src={objectUrl} title={detail.name} className="size-full border-0" />
      )}
    </ViewerShell>
  );
};

type BackButtonProperties = {
  children: ReactNode;
  label: string;
};

const BackButton = ({ children, label }: BackButtonProperties): ReactElement => (
  <Button asChild variant="ghost" size="icon" aria-label={label}>
    {children}
  </Button>
);

type ViewerShellProperties = {
  children: ReactNode;
  back?: ReactNode;
  name?: string;
  meta?: string;
  actions?: ReactNode;
};

const ViewerShell = ({
  children,
  back,
  name,
  meta,
  actions,
}: ViewerShellProperties): ReactElement => (
  <div className="flex h-screen flex-col bg-muted/30">
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-3 sm:px-6">
      {back}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold" title={name}>
          {name ?? 'Document'}
        </h1>
        {meta === undefined ? null : <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>

      {actions}
    </header>

    <main className="min-h-0 flex-1">{children}</main>
  </div>
);

const ViewerState = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export { BackButton, FileViewer, type DownloadState, type FileViewState };
