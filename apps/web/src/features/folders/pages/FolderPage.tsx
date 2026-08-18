import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { FolderOpen, FolderPlus, LoaderCircle, Lock, SearchX } from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { FileDropzone, UploadButton, UploadQueuePanel } from '@/features/files/components';
import { useUploadQueue } from '@/features/files/hooks';
import { useDocumentTitle } from '@/hooks';

import { ContentsTable, CreateFolderDialog, FolderBreadcrumbs } from '../components';
import { useFolderBreadcrumbs, useFolderContents } from '../hooks';
import { toFolderFailure } from '../utils/to-folder-error';

const APP_TITLE = 'Data Room';

type FolderPageProperties = {
  rootFolderId: string;
};

const FolderPage = ({ rootFolderId }: FolderPageProperties): ReactElement => {
  const navigate = useNavigate();
  const { folder } = useSearch({ from: '/' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const currentFolderId = folder ?? rootFolderId;

  const openFolder = (folderId: string): void => {
    void navigate({
      to: '/',
      search: folderId === rootFolderId ? {} : { folder: folderId },
    });
  };

  const contents = useFolderContents(currentFolderId);
  const uploads = useUploadQueue(currentFolderId);

  const breadcrumbs = useFolderBreadcrumbs(currentFolderId);
  const openFolderName =
    !breadcrumbs.isError && breadcrumbs.data?.status === 200
      ? breadcrumbs.data.body.items.at(-1)?.name
      : undefined;

  useDocumentTitle(openFolderName === undefined ? APP_TITLE : `${openFolderName} — ${APP_TITLE}`);

  const entries =
    contents.data?.pages.flatMap((page) => (page.status === 200 ? page.body.items : [])) ?? [];

  const failure = contents.isError ? toFolderFailure(contents.error) : null;

  const isTerminalFailure = failure === 'missing' || failure === 'forbidden';
  const hasEntries = entries.length > 0;

  const isInitialLoading = contents.isPending && !hasEntries;
  const showsFailureScreen = isTerminalFailure || (failure !== null && !hasEntries);

  const shell = (children: ReactNode): ReactElement => (
    <FolderShell
      rootFolderId={rootFolderId}
      currentFolderId={currentFolderId}
      onCreate={showsFailureScreen ? undefined : () => setIsCreateOpen(true)}
      onFiles={showsFailureScreen ? undefined : uploads.enqueue}
    >
      {children}

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
    </FolderShell>
  );

  if (isInitialLoading) {
    return shell(
      <FolderState>
        <LoaderCircle
          className="size-5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p>Opening folder…</p>
      </FolderState>,
    );
  }

  if (showsFailureScreen && failure !== null) {
    return shell(
      <FailureState
        failure={failure}
        rootFolderId={rootFolderId}
        currentFolderId={currentFolderId}
        onRetry={() => void contents.refetch()}
      />,
    );
  }

  return shell(
    !hasEntries ? (
      <FolderState>
        <FolderOpen className="size-6 text-muted-foreground" aria-hidden="true" />
        <p>This folder is empty. Drop PDF files here to upload them.</p>
        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(true)}>
          New folder
        </Button>
      </FolderState>
    ) : (
      <>
        <ContentsTable
          key={currentFolderId}
          entries={entries}
          currentFolderId={currentFolderId}
          rootFolderId={rootFolderId}
          onOpenFolder={openFolder}
        />

        {failure === null ? null : (
          <InlineFailure
            message={
              contents.isFetchNextPageError
                ? 'We could not load more items.'
                : 'We could not refresh this folder. You are seeing the last loaded contents.'
            }
            isRetrying={contents.isFetchingNextPage || contents.isRefetching}
            onRetry={() => {
              if (contents.isFetchNextPageError) {
                void contents.fetchNextPage();

                return;
              }

              void contents.refetch();
            }}
          />
        )}

        {contents.hasNextPage && !contents.isFetchNextPageError ? (
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={contents.isFetchingNextPage}
              onClick={() => void contents.fetchNextPage()}
            >
              {contents.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </>
    ),
  );
};

type InlineFailureProperties = {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
};

const InlineFailure = ({ message, isRetrying, onRetry }: InlineFailureProperties): ReactElement => (
  <div
    role="alert"
    className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
  >
    <span className="text-destructive">{message}</span>

    <Button type="button" variant="outline" size="sm" disabled={isRetrying} onClick={onRetry}>
      {isRetrying ? 'Retrying…' : 'Try again'}
    </Button>
  </div>
);

type FailureStateProperties = {
  failure: ReturnType<typeof toFolderFailure>;
  rootFolderId: string;
  currentFolderId: string;
  onRetry: () => void;
};

const FailureState = ({
  failure,
  rootFolderId,
  currentFolderId,
  onRetry,
}: FailureStateProperties): ReactElement => {
  if (failure === 'missing') {
    return (
      <FolderState>
        <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
        <p>This folder is no longer available. It may have been deleted.</p>
        {currentFolderId === rootFolderId ? null : (
          <Button asChild variant="outline">
            <Link to="/" search={{}}>
              Back to my data room
            </Link>
          </Button>
        )}
      </FolderState>
    );
  }

  if (failure === 'forbidden') {
    return (
      <FolderState>
        <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
        <p>You do not have access to this folder.</p>
        {currentFolderId === rootFolderId ? null : (
          <Button asChild variant="outline">
            <Link to="/" search={{}}>
              Back to my data room
            </Link>
          </Button>
        )}
      </FolderState>
    );
  }

  return (
    <FolderState>
      <p>
        {failure === 'offline'
          ? 'Cannot reach the server. Check your connection and try again.'
          : 'We could not load this folder.'}
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </FolderState>
  );
};

type FolderShellProperties = {
  children: ReactNode;
  currentFolderId: string;
  rootFolderId: string;
  onCreate?: () => void;
  onFiles?: (files: File[]) => void;
};

const FolderShell = ({
  children,
  currentFolderId,
  rootFolderId,
  onCreate,
  onFiles,
}: FolderShellProperties): ReactElement => {
  const card = (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      {children}
    </div>
  );

  return (
    <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <FolderBreadcrumbs currentFolderId={currentFolderId} rootFolderId={rootFolderId} />

        <div className="flex flex-wrap items-center gap-2">
          {onFiles === undefined ? null : <UploadButton onFiles={onFiles} />}

          {onCreate === undefined ? null : (
            <Button type="button" size="lg" onClick={onCreate}>
              <FolderPlus aria-hidden="true" />
              New folder
            </Button>
          )}
        </div>
      </div>

      {onFiles === undefined ? (
        card
      ) : (
        <FileDropzone onFiles={onFiles} className="flex min-h-0 flex-1 flex-col">
          {card}
        </FileDropzone>
      )}
    </section>
  );
};

const FolderState = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export { FolderPage };
