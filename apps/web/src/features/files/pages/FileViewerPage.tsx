import { Link } from '@tanstack/react-router';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks';
import { tsr } from '@/lib/api-client';
import { formatBytes } from '@/lib/format-bytes';

import { DownloadFileButton } from '../components';
import { useFile, useFileDownloadUrl, usePdfObjectUrl } from '../hooks';
import { toFileErrorMessage, toFileFailure } from '../utils/to-file-error';

const APP_TITLE = 'Data Room';

const PREVIEW_FAILED_MESSAGE =
  'This document could not be shown here. Use Download to open it with another application.';

type FileViewerPageProperties = {
  fileId: string;
};

const FileViewerPage = ({ fileId }: FileViewerPageProperties): ReactElement => {
  const { session } = useSession();

  const file = useFile(fileId);
  const download = useFileDownloadUrl(fileId);

  const detail = file.data?.status === 200 ? file.data.body : null;
  const signedUrl = download.data?.status === 200 ? download.data.body.url : null;

  const { objectUrl, hasFailed } = usePdfObjectUrl(signedUrl);

  useDocumentTitle(detail === null ? APP_TITLE : `${detail.name} — ${APP_TITLE}`);

  const rootFolderId = session?.dataRoom.rootFolderId ?? null;

  const backSearch =
    detail === null || detail.folderId === rootFolderId ? {} : { folder: detail.folderId };

  if (file.isPending) {
    return (
      <ViewerShell backSearch={{}}>
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

  if (detail === null) {
    const failure = toFileFailure(file.error ?? file.data);

    return (
      <ViewerShell backSearch={{}}>
        <ViewerState>
          <p>
            {failure === 'missing'
              ? 'This document is no longer available. It may have been deleted.'
              : toFileErrorMessage(file.error ?? file.data)}
          </p>

          {failure === 'missing' || failure === 'forbidden' ? null : (
            <Button type="button" variant="outline" size="sm" onClick={() => void file.refetch()}>
              Try again
            </Button>
          )}
        </ViewerState>
      </ViewerShell>
    );
  }

  const downloadFailure =
    download.isError || (download.data !== undefined && download.data.status !== 200)
      ? toFileErrorMessage(download.error ?? download.data)
      : null;

  const isPreparing =
    download.isPending || (signedUrl !== null && objectUrl === null && !hasFailed);

  /**
   * An imperative call, deliberately not `download.refetch()`. A refetch writes to the observed
   * query, which would restart the preview's cross-origin fetch of the whole document, and on a
   * network failure it resolves with the previous cached response — handing back the very URL that
   * has already expired. This touches no cache and rejects when the request fails.
   */
  const requestFreshUrl = async (): Promise<string | null> => {
    try {
      const response = await tsr.files.getDownloadUrl.query({ params: { fileId } });

      return response.status === 200 ? response.body.url : null;
    } catch {
      return null;
    }
  };

  return (
    <ViewerShell
      backSearch={backSearch}
      name={detail.name}
      meta={`${formatBytes(detail.sizeBytes)} · version ${detail.versionNumber}`}
      actions={
        <DownloadFileButton
          fileName={detail.name}
          objectUrl={objectUrl}
          canDownload={signedUrl !== null}
          onRequestFreshUrl={requestFreshUrl}
        />
      }
    >
      {isPreparing && downloadFailure === null ? (
        <ViewerState>
          <LoaderCircle
            className="size-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <p>Loading the document…</p>
        </ViewerState>
      ) : null}

      {downloadFailure === null ? null : (
        <ViewerState>
          <p>{downloadFailure}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void download.refetch()}>
            Try again
          </Button>
        </ViewerState>
      )}

      {hasFailed && downloadFailure === null ? (
        <ViewerState>
          <p>{PREVIEW_FAILED_MESSAGE}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void download.refetch()}>
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

type ViewerShellProperties = {
  children: ReactNode;
  backSearch: { folder?: string };
  name?: string;
  meta?: string;
  actions?: ReactNode;
};

const ViewerShell = ({
  children,
  backSearch,
  name,
  meta,
  actions,
}: ViewerShellProperties): ReactElement => (
  <div className="flex h-screen flex-col bg-muted/30">
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-background px-4 py-3 sm:px-6">
      <Button asChild variant="ghost" size="icon" aria-label="Back to the data room">
        <Link to="/" search={backSearch}>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </Button>

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

export { FileViewerPage };
