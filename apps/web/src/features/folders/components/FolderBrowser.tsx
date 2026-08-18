import { type ContentsEntry, type ShareTarget } from '@data-room/contracts';
import { FolderOpen, FolderPlus, LoaderCircle, Lock, SearchX } from 'lucide-react';
import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/features/files/components/FileDropzone';
import { UploadButton } from '@/features/files/components/UploadButton';

import { isTerminalFolderFailure, type FolderFailure } from '../utils/to-folder-error';
import { ContentsTable } from './ContentsTable';
import { type ContentsNavigation } from './contents-navigation.type';
import { FolderBreadcrumbs, type BreadcrumbItem, type BreadcrumbTrail } from './FolderBreadcrumbs';

type FolderContentsView = {
  entries: ContentsEntry[];
  failure: FolderFailure | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
};

// Its presence is the write capability: no actions, no dropzone, no editors anywhere below
type FolderWriteActions = {
  rootFolderId: string;
  onCreateFolder: () => void;
  onFiles: (files: File[]) => void;
  onShare: (request: { target: ShareTarget; name: string }) => void;
};

type FolderBreadcrumbsView = {
  trail: BreadcrumbTrail;
  renderItem: (item: BreadcrumbItem, isCurrent: boolean) => ReactElement;
  renderHome?: () => ReactElement;
};

type FolderBrowserProperties = {
  currentFolderId: string;
  contents: FolderContentsView;
  navigation: ContentsNavigation;
  breadcrumbs: FolderBreadcrumbsView;
  write?: FolderWriteActions;
  renderExit?: () => ReactElement;
  renderFailureAction?: () => ReactElement;
  overlays?: ReactNode;
};

const FolderBrowser = ({
  currentFolderId,
  contents,
  navigation,
  breadcrumbs,
  write,
  renderExit,
  renderFailureAction,
  overlays,
}: FolderBrowserProperties): ReactElement => {
  const { entries, failure } = contents;

  const hasEntries = entries.length > 0;
  const isTerminalFailure = failure !== null && isTerminalFolderFailure(failure);
  const showsFailureScreen = isTerminalFailure || (failure !== null && !hasEntries);

  // A dead or forbidden folder must not offer an upload or a new folder inside it
  const activeWrite = showsFailureScreen ? undefined : write;

  const shell = (children: ReactNode): ReactElement => {
    const card = (
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        {children}
        {overlays}
      </div>
    );

    return (
      <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <FolderBreadcrumbs
            trail={breadcrumbs.trail}
            renderItem={breadcrumbs.renderItem}
            renderHome={breadcrumbs.renderHome}
          />

          <div className="flex flex-wrap items-center gap-2">
            {renderExit === undefined ? null : renderExit()}

            {activeWrite === undefined ? null : (
              <>
                <UploadButton onFiles={activeWrite.onFiles} />

                <Button type="button" size="lg" onClick={activeWrite.onCreateFolder}>
                  <FolderPlus aria-hidden="true" />
                  New folder
                </Button>
              </>
            )}
          </div>
        </div>

        {activeWrite === undefined ? (
          card
        ) : (
          <FileDropzone onFiles={activeWrite.onFiles} className="flex min-h-0 flex-1 flex-col">
            {card}
          </FileDropzone>
        )}
      </section>
    );
  };

  if (contents.isInitialLoading) {
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
        renderAction={renderFailureAction}
        onRetry={contents.onRetry}
      />,
    );
  }

  return shell(
    !hasEntries ? (
      <FolderState>
        <FolderOpen className="size-6 text-muted-foreground" aria-hidden="true" />
        <p>
          {activeWrite === undefined
            ? 'This folder is empty.'
            : 'This folder is empty. Drop PDF files here to upload them.'}
        </p>
        {activeWrite === undefined ? null : (
          <Button type="button" variant="outline" onClick={activeWrite.onCreateFolder}>
            New folder
          </Button>
        )}
      </FolderState>
    ) : (
      <>
        <ContentsTable
          key={currentFolderId}
          entries={entries}
          navigation={navigation}
          writeContext={
            write === undefined
              ? undefined
              : {
                  currentFolderId,
                  rootFolderId: write.rootFolderId,
                  onShare: write.onShare,
                }
          }
        />

        {failure === null ? null : (
          <InlineFailure
            message={
              contents.isFetchNextPageError
                ? 'We could not load more items.'
                : 'We could not refresh this folder. You are seeing the last loaded contents.'
            }
            isRetrying={contents.isRefreshing}
            onRetry={contents.onRetry}
          />
        )}

        {contents.hasNextPage && !contents.isFetchNextPageError ? (
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={contents.isFetchingNextPage}
              onClick={contents.onLoadMore}
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
  failure: FolderFailure;
  renderAction?: () => ReactElement;
  onRetry: () => void;
};

const FailureState = ({ failure, renderAction, onRetry }: FailureStateProperties): ReactElement => {
  if (failure === 'missing') {
    return (
      <FolderState>
        <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
        <p>This folder is no longer available. It may have been deleted.</p>
        {renderAction === undefined ? null : renderAction()}
      </FolderState>
    );
  }

  if (failure === 'forbidden') {
    return (
      <FolderState>
        <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
        <p>You do not have access to this folder.</p>
        {renderAction === undefined ? null : renderAction()}
      </FolderState>
    );
  }

  if (failure === 'malformed') {
    return (
      <FolderState>
        <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
        <p>This link is not valid. Check that you copied the whole address.</p>
        {renderAction === undefined ? null : renderAction()}
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

const FolderState = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="flex min-h-56 flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export { FolderBrowser, type FolderContentsView, type FolderWriteActions };
