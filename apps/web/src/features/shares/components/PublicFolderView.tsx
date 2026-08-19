import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback, useMemo, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { FolderBrowser } from '@/features/folders/components';
import { type ContentsNavigation } from '@/features/folders/components/contents-navigation.type';
import { type BreadcrumbTrail } from '@/features/folders/components/FolderBreadcrumbs';
import { isTerminalFolderFailure, toFolderFailure } from '@/features/folders/utils/to-folder-error';
import { useDocumentTitle } from '@/hooks';

import { usePublicFolderBreadcrumbs, usePublicFolderContents } from '../hooks';

const APP_TITLE = 'Shared documents';

type PublicFolderViewProperties = {
  token: string;
  rootFolderId: string;
  folderId: string;
};

// Mounted only after the token resolves: the root folder decides which contents query runs
const PublicFolderView = ({
  token,
  rootFolderId,
  folderId,
}: PublicFolderViewProperties): ReactElement => {
  const navigate = useNavigate();
  const router = useRouter();

  // The root is the share itself, so it carries no folder parameter
  const searchFor = useCallback(
    (id: string) => (id === rootFolderId ? {} : { folder: id }),
    [rootFolderId],
  );

  const openFolder = useCallback(
    (nextFolderId: string): void => {
      void navigate({
        to: '/share/$token',
        params: { token },
        search: searchFor(nextFolderId),
      });
    },
    [navigate, searchFor, token],
  );

  const navigation = useMemo(
    () =>
      ({
        renderFolderLink: ({ id, children, className, onClick }) => (
          <Link
            to="/share/$token"
            params={{ token }}
            search={searchFor(id)}
            className={className}
            onClick={onClick}
          >
            {children}
          </Link>
        ),
        renderFileLink: ({ id, children, className, onClick }) => (
          <Link
            to="/share/$token/files/$fileId"
            params={{ token, fileId: id }}
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
            to: '/share/$token/files/$fileId',
            params: { token, fileId },
          });

          globalThis.open(href, '_blank', 'noopener');
        },
      }) satisfies ContentsNavigation,
    [openFolder, router, searchFor, token],
  );

  const contents = usePublicFolderContents(token, folderId);
  const breadcrumbs = usePublicFolderBreadcrumbs(token, folderId);

  const breadcrumbItems =
    !breadcrumbs.isError && breadcrumbs.data?.status === 200 ? breadcrumbs.data.body.items : [];

  useDocumentTitle(
    breadcrumbItems.at(-1) === undefined
      ? APP_TITLE
      : `${breadcrumbItems.at(-1)?.name} — ${APP_TITLE}`,
  );

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
            <Link to="/share/$token" params={{ token }} search={searchFor(item.id)}>
              {item.name}
            </Link>
          </Button>
        ),
      }}
    />
  );
};

export { PublicFolderView };
