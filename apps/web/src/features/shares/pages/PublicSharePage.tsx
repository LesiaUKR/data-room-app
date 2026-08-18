import { ResourceKind, type ShareTargetView } from '@data-room/contracts';
import { Navigate } from '@tanstack/react-router';
import { type ReactElement } from 'react';

import { FullPageMessage } from '@/components/FullPageMessage';
import { Button } from '@/components/ui/button';

import { PublicFolderView } from '../components/PublicFolderView';
import { usePublicShare } from '../hooks';
import { toPublicShareViewFailure } from '../utils/public-share-messages';

type PublicSharePageProperties = {
  token: string;
  folderId?: string;
};

// A data room is not listable itself, so its share starts at the root folder it carries
const toRootFolderId = (target: ShareTargetView): string | null => {
  if (target.kind === ResourceKind.DATA_ROOM) {
    return target.rootFolderId;
  }

  return target.kind === ResourceKind.FOLDER ? target.id : null;
};

/**
 * Entry point of a public link. It resolves the token first, because what the link points at
 * decides which screen the reader gets - and the contents query cannot run before that is known.
 */
const PublicSharePage = ({ token, folderId }: PublicSharePageProperties): ReactElement => {
  const share = usePublicShare(token);

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

  const rootFolderId = toRootFolderId(target);

  if (rootFolderId === null) {
    return (
      <Navigate to="/share/$token/files/$fileId" params={{ token, fileId: target.id }} replace />
    );
  }

  return (
    <PublicFolderView
      token={token}
      rootFolderId={rootFolderId}
      folderId={folderId ?? rootFolderId}
    />
  );
};

export { PublicSharePage };
