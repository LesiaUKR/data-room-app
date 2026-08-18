import { type ShareTarget } from '@data-room/contracts';
import { Link, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { UploadQueuePanel } from '@/features/files/components/UploadQueuePanel';
import { useUploadQueue } from '@/features/files/hooks';
import { ShareDialog } from '@/features/shares/components';
import { useDocumentTitle } from '@/hooks';

import { CreateFolderDialog, FolderBrowser } from '../components';
import { type ContentsNavigation } from '../components/contents-navigation.type';
import { type BreadcrumbTrail } from '../components/FolderBreadcrumbs';
import { useFolderBreadcrumbs, useFolderContents } from '../hooks';
import { isTerminalFolderFailure, toFolderFailure } from '../utils/to-folder-error';

const APP_TITLE = 'Data Room';

type FolderPageProperties = {
  rootFolderId: string;
};

const FolderPage = ({ rootFolderId }: FolderPageProperties): ReactElement => {
  const navigate = useNavigate();
  const router = useRouter();
  const { folder } = useSearch({ from: '/' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [shareRequest, setShareRequest] = useState<{ target: ShareTarget; name: string } | null>(
    null,
  );

  const currentFolderId = folder ?? rootFolderId;
  const isRoot = currentFolderId === rootFolderId;

  const openFolder = useCallback(
    (folderId: string): void => {
      void navigate({
        to: '/',
        search: folderId === rootFolderId ? {} : { folder: folderId },
      });
    },
    [navigate, rootFolderId],
  );

  // The viewer opens in a new tab, so the way back has to travel with the link
  const fileOrigin = useMemo(
    () => ({ from: 'room' as const, folder: isRoot ? undefined : currentFolderId }),
    [currentFolderId, isRoot],
  );

  const navigation = useMemo(
    () =>
      ({
        renderFolderLink: ({ id, children, className, onClick }) => (
          <Link to="/" search={{ folder: id }} className={className} onClick={onClick}>
            {children}
          </Link>
        ),
        renderFileLink: ({ id, children, className, onClick }) => (
          <Link
            to="/files/$fileId"
            params={{ fileId: id }}
            search={fileOrigin}
            target="_blank"
            rel="noreferrer"
            className={className}
            onClick={onClick}
          >
            {children}
          </Link>
        ),
        openFolder,
        // The router owns the route, so renaming it fails typecheck here rather than at runtime
        openFileInNewTab: (fileId) => {
          const { href } = router.buildLocation({
            to: '/files/$fileId',
            params: { fileId },
            search: fileOrigin,
          });

          globalThis.open(href, '_blank', 'noopener');
        },
      }) satisfies ContentsNavigation,
    [fileOrigin, openFolder, router],
  );

  const contents = useFolderContents(currentFolderId);
  const uploads = useUploadQueue(currentFolderId);
  const breadcrumbs = useFolderBreadcrumbs(currentFolderId);

  const breadcrumbItems =
    !breadcrumbs.isError && breadcrumbs.data?.status === 200 ? breadcrumbs.data.body.items : [];

  useDocumentTitle(
    breadcrumbItems.at(-1) === undefined
      ? APP_TITLE
      : `${breadcrumbItems.at(-1)?.name} — ${APP_TITLE}`,
  );

  const resolveTrail = (): BreadcrumbTrail => {
    if (isRoot) {
      return { status: 'hidden' };
    }

    if (breadcrumbs.isPending) {
      return { status: 'pending' };
    }

    if (breadcrumbs.isError) {
      const breadcrumbFailure = toFolderFailure(breadcrumbs.error);

      return isTerminalFolderFailure(breadcrumbFailure)
        ? { status: 'unavailable' }
        : {
            status: 'failed',
            onRetry: () => {
              void breadcrumbs.refetch();
            },
          };
    }

    return { status: 'ready', items: breadcrumbItems };
  };

  const entries =
    contents.data?.pages.flatMap((page) => (page.status === 200 ? page.body.items : [])) ?? [];

  const retryContents = (): void => {
    if (contents.isFetchNextPageError) {
      void contents.fetchNextPage();

      return;
    }

    void contents.refetch();
  };

  return (
    <FolderBrowser
      currentFolderId={currentFolderId}
      navigation={navigation}
      contents={{
        entries,
        failure: contents.isError ? toFolderFailure(contents.error) : null,
        isInitialLoading: contents.isPending && entries.length === 0,
        isRefreshing: contents.isFetchingNextPage || contents.isRefetching,
        isFetchNextPageError: contents.isFetchNextPageError,
        hasNextPage: contents.hasNextPage,
        isFetchingNextPage: contents.isFetchingNextPage,
        onRetry: retryContents,
        onLoadMore: () => {
          void contents.fetchNextPage();
        },
      }}
      breadcrumbs={{
        trail: resolveTrail(),
        renderHome: () => (
          <Button asChild variant={isRoot ? 'secondary' : 'ghost'} size="sm">
            <Link to="/" search={{}}>
              My data room
            </Link>
          </Button>
        ),
        renderItem: (item, isCurrent) => (
          <Button asChild variant={isCurrent ? 'secondary' : 'ghost'} size="sm">
            <Link to="/" search={{ folder: item.id }}>
              {item.name}
            </Link>
          </Button>
        ),
      }}
      write={{
        rootFolderId,
        onCreateFolder: () => setIsCreateOpen(true),
        onFiles: uploads.enqueue,
        onShare: setShareRequest,
      }}
      renderFailureAction={
        isRoot
          ? undefined
          : () => (
              <Button asChild variant="outline">
                <Link to="/" search={{}}>
                  Back to my data room
                </Link>
              </Button>
            )
      }
      overlays={
        <>
          <CreateFolderDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            parentFolderId={currentFolderId}
          />

          <UploadQueuePanel
            items={uploads.items}
            onDismiss={uploads.dismiss}
            onClearFinished={uploads.clearFinished}
          />

          {shareRequest === null ? null : (
            <ShareDialog
              open
              onOpenChange={(next) => {
                if (!next) {
                  setShareRequest(null);
                }
              }}
              target={shareRequest.target}
              resourceName={shareRequest.name}
            />
          )}
        </>
      }
    />
  );
};

export { FolderPage };
