import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { type ReactElement } from 'react';

import { tsr } from '@/lib/api-client';

import {
  BackButton,
  FileViewer,
  type DownloadState,
  type FileViewState,
} from '../components/FileViewer';
import { useFile, useFileDownloadUrl } from '../hooks';
import { toFileErrorMessage, toFileViewFailure } from '../utils/to-file-error';

/** Where the document was opened from. A new tab has no history, so the way back travels in the URL. */
type FileOrigin = {
  from?: 'room' | 'shared';
  folder?: string;
};

type FileViewerPageProperties = {
  fileId: string;
  origin: FileOrigin;
};

const FileViewerPage = ({ fileId, origin }: FileViewerPageProperties): ReactElement => {
  const file = useFile(fileId);
  const download = useFileDownloadUrl(fileId);

  // Not `refetch()`: that restarts the preview fetch and on failure returns the expired URL
  const requestFreshUrl = async (): Promise<string | null> => {
    try {
      const response = await tsr.files.getDownloadUrl.query({ params: { fileId } });

      return response.status === 200 ? response.body.url : null;
    } catch {
      return null;
    }
  };

  const resolveDownload = (): DownloadState => {
    if (download.isError || (download.data !== undefined && download.data.status !== 200)) {
      return { status: 'failed', message: toFileErrorMessage(download.error ?? download.data) };
    }

    if (download.data?.status === 200) {
      return { status: 'ready', signedUrl: download.data.body.url };
    }

    return { status: 'pending' };
  };

  const resolveFile = (): FileViewState => {
    if (file.isPending) {
      return { status: 'pending' };
    }

    if (file.isError) {
      const { message, isTerminal } = toFileViewFailure(file.error);

      return {
        status: 'failed',
        message,
        onRetry: isTerminal
          ? undefined
          : () => {
              void file.refetch();
            },
      };
    }

    const detail = file.data?.status === 200 ? file.data.body : null;

    if (detail === null) {
      const { message, isTerminal } = toFileViewFailure(file.error ?? file.data);

      return {
        status: 'failed',
        message,
        onRetry: isTerminal
          ? undefined
          : () => {
              void file.refetch();
            },
      };
    }

    return {
      status: 'ready',
      detail,
      download: resolveDownload(),
      onRetryDownload: () => {
        void download.refetch();
      },
      requestFreshUrl,
    };
  };

  const back =
    origin.from === 'shared' && origin.folder !== undefined ? (
      <BackButton label="Back to the shared folder">
        <Link to="/folders/$folderId" params={{ folderId: origin.folder }}>
          <ArrowLeft aria-hidden="true" />
        </Link>
      </BackButton>
    ) : (
      <BackButton label="Back to the data room">
        <Link
          to="/"
          search={
            origin.from === 'room' && origin.folder !== undefined ? { folder: origin.folder } : {}
          }
        >
          <ArrowLeft aria-hidden="true" />
        </Link>
      </BackButton>
    );

  return <FileViewer file={resolveFile()} back={back} />;
};

export { FileViewerPage };
