import { ResourceKind } from '@data-room/contracts';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { type ReactElement } from 'react';

import { FullPageMessage } from '@/components/FullPageMessage';
import { Button } from '@/components/ui/button';
import {
  BackButton,
  FileViewer,
  type DownloadState,
  type FileViewState,
} from '@/features/files/components';
import { toFileErrorMessage, toFileViewFailure } from '@/features/files/utils/to-file-error';
import { tsr } from '@/lib/api-client';

import { usePublicFile, usePublicFileDownloadUrl, usePublicShare } from '../hooks';
import { toPublicShareViewFailure } from '../utils/public-share-messages';

type PublicFileViewerPageProperties = {
  token: string;
  fileId: string;
};

const PublicFileViewerPage = ({ token, fileId }: PublicFileViewerPageProperties): ReactElement => {
  // Cached by the same key the landing page used, so this costs no extra request
  const share = usePublicShare(token);

  const file = usePublicFile(token, fileId);
  const download = usePublicFileDownloadUrl(token, fileId);

  const requestFreshUrl = async (): Promise<string | null> => {
    try {
      const response = await tsr.publicShares.getDownloadUrl.query({ params: { token, fileId } });

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
      const failure = toPublicShareViewFailure(file.error);

      return {
        status: 'failed',
        message: failure.message,
        onRetry: failure.isTerminal
          ? undefined
          : () => {
              void file.refetch();
            },
      };
    }

    const downloadFailureValue =
      download.isError || (download.data !== undefined && download.data.status !== 200)
        ? (download.error ?? download.data)
        : null;

    if (downloadFailureValue !== null) {
      const failure = toPublicShareViewFailure(downloadFailureValue);

      if (failure.isTerminal) {
        return { status: 'failed', message: failure.message };
      }
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

  if (share.isPending) {
    return <FullPageMessage>Opening the shared link…</FullPageMessage>;
  }

  if (share.isError || share.data?.status !== 200) {
    const failure = toPublicShareViewFailure(share.error ?? share.data);

    return (
      <FullPageMessage
        action={
          failure.isTerminal ? undefined : (
            <Button type="button" variant="outline" onClick={() => void share.refetch()}>
              Try again
            </Button>
          )
        }
      >
        {failure.message}
      </FullPageMessage>
    );
  }

  const target = share.data.body.target;

  const detail = file.data?.status === 200 ? file.data.body : null;

  // A link that points at the document itself has no folder to go back to
  const back =
    target.kind === ResourceKind.FILE ? undefined : (
      <BackButton label="Back to the shared folder">
        <Link
          to="/share/$token"
          params={{ token }}
          search={detail === null ? {} : { folder: detail.folderId }}
        >
          <ArrowLeft aria-hidden="true" />
        </Link>
      </BackButton>
    );

  return <FileViewer file={resolveFile()} back={back} />;
};

export { PublicFileViewerPage };
