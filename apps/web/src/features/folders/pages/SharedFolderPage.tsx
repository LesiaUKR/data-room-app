import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback, useMemo, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks';

import { FolderBrowser } from '../components';
import { type ContentsNavigation } from '../components/contents-navigation.type';
import { type BreadcrumbTrail } from '../components/FolderBreadcrumbs';
import { useFolderBreadcrumbs, useFolderContents } from '../hooks';
import { isTerminalFolderFailure, toFolderFailure } from '../utils/to-folder-error';

const APP_TITLE = 'Data Room';

type SharedFolderPageProperties = {
  folderId: string;
};

/**
 * A folder someone shared with this user. It reads the same authenticated endpoints as their own
 * room - the grant is resolved by the policy on the server - but never offers a write action.
 */
const SharedFolderPage = ({ folderId }: SharedFolderPageProperties): ReactElement => {
  const navigate = useNavigate();
  const router = useRouter();

  const openFolder = useCallback(
    (nextFolderId: string): void => {
      void navigate({ to: '/folders/$folderId', params: { folderId: nextFolderId } });
    },
    [navigate],
  );

  const navigation = useMemo(
    () =>
      ({
        renderFolderLink: ({ id, children, className, onClick }) => (
          <Link
            to="/folders/$folderId"
            params={{ folderId: id }}
            className={className}
            onClick={onClick}
          >
            {children}
          </Link>
        ),
        renderFileLink: ({ id, children, className, onClick }) => (
          <Link
            to="/files/$fileId"
            params={{ fileId: id }}
            search={{ from: 'shared', folder: folderId }}
            target="_blank"
            rel="noreferrer"
            className={className}
            onClick={onClick}
          >
            {children}
          </Link>
        ),
        openFolder,
        openFileInNewTab: (fileId) => {
          const { href } = router.buildLocation({
            to: '/files/$fileId',
            params: { fileId },
            search: { from: 'shared', folder: folderId },
          });

          globalThis.open(href, '_blank', 'noopener');
        },
      }) satisfies ContentsNavigation,
    [folderId, openFolder, router],
  );

  const contents = useFolderContents(folderId);
  const breadcrumbs = useFolderBreadcrumbs(folderId);

  const breadcrumbItems =
    !breadcrumbs.isError && breadcrumbs.data?.status === 200 ? breadcrumbs.data.body.items : [];

  useDocumentTitle(
    breadcrumbItems.at(-1) === undefined
      ? APP_TITLE
      : `${breadcrumbItems.at(-1)?.name} — ${APP_TITLE}`,
  );

  // No home segment: the server already clamps the chain to the shared folder, and anything
  // above it belongs to a room this user cannot see
  const resolveTrail = (): BreadcrumbTrail => {
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
      currentFolderId={folderId}
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
        renderItem: (item, isCurrent) => (
          <Button asChild variant={isCurrent ? 'secondary' : 'ghost'} size="sm">
            <Link to="/folders/$folderId" params={{ folderId: item.id }}>
              {item.name}
            </Link>
          </Button>
        ),
      }}
      renderExit={() => (
        <Button asChild variant="outline" size="sm">
          <Link to="/" search={{}}>
            My data room
          </Link>
        </Button>
      )}
    />
  );
};

export { SharedFolderPage };
