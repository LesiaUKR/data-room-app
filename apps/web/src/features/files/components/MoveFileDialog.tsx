import { type ContentsFileEntry } from '@data-room/contracts';
import { ChevronRight, Folder, FolderOpen, LoaderCircle } from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFolderBreadcrumbs, useFolderContents } from '@/features/folders/hooks';

import { useFileMutations } from '../hooks';
import { toFileErrorMessage } from '../utils/to-file-error';

const ROOT_LABEL = 'My data room';

type MoveFileDialogProperties = {
  file: ContentsFileEntry;
  currentFolderId: string;
  rootFolderId: string;
  onClose: () => void;
};

/** Browses the actor's own room only, which is what keeps the destination inside one tenant. */
const MoveFileDialog = ({
  file,
  currentFolderId,
  rootFolderId,
  onClose,
}: MoveFileDialogProperties): ReactElement => {
  const { move } = useFileMutations(currentFolderId);

  const [browseFolderId, setBrowseFolderId] = useState(rootFolderId);
  const [moveError, setMoveError] = useState<string | null>(null);

  const contents = useFolderContents(browseFolderId);
  const breadcrumbs = useFolderBreadcrumbs(browseFolderId);

  const trail = breadcrumbs.data?.status === 200 ? breadcrumbs.data.body.items : [];

  const folders =
    contents.data?.pages
      .flatMap((page) => (page.status === 200 ? page.body.items : []))
      .filter((entry) => entry.kind === 'folder') ?? [];

  const isAlreadyHere = browseFolderId === currentFolderId;

  const handleConfirm = (): void => {
    setMoveError(null);

    move.mutate(
      { params: { fileId: file.id }, body: { folderId: browseFolderId } },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          setMoveError(toFileErrorMessage(error));
        },
      },
    );
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !move.isPending) {
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={!move.isPending}>
        <DialogHeader>
          <DialogTitle className="truncate" title={file.name}>
            Move “{file.name}”
          </DialogTitle>
          <DialogDescription>Choose the folder this document should live in.</DialogDescription>
        </DialogHeader>

        <nav
          aria-label="Destination path"
          className="flex items-center gap-1 overflow-x-auto overflow-y-hidden text-sm"
        >
          <PathButton
            label={ROOT_LABEL}
            isCurrent={browseFolderId === rootFolderId}
            onSelect={() => setBrowseFolderId(rootFolderId)}
          />

          {trail.map((crumb) => (
            <span key={crumb.id} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <PathButton
                label={crumb.name}
                isCurrent={crumb.id === browseFolderId}
                onSelect={() => setBrowseFolderId(crumb.id)}
              />
            </span>
          ))}
        </nav>

        <div className="scroll-slim h-56 overflow-y-auto rounded-lg border">
          {contents.isPending ? (
            <BrowserState>
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              <p>Loading folders…</p>
            </BrowserState>
          ) : null}

          {!contents.isPending && contents.isError ? (
            <BrowserState>
              <p>{toFileErrorMessage(contents.error)}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void contents.refetch()}
              >
                Try again
              </Button>
            </BrowserState>
          ) : null}

          {!contents.isPending && !contents.isError && folders.length === 0 ? (
            <BrowserState>
              <FolderOpen className="size-5" aria-hidden="true" />
              <p>No subfolders here.</p>
            </BrowserState>
          ) : null}

          <ul>
            {folders.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
                  onClick={() => setBrowseFolderId(folder.id)}
                >
                  <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{folder.name}</span>
                  <ChevronRight
                    className="ml-auto size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>

          {contents.hasNextPage ? (
            <div className="p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={contents.isFetchingNextPage}
                onClick={() => void contents.fetchNextPage()}
              >
                {contents.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>

        <div aria-live="polite" className="min-h-5">
          {isAlreadyHere ? (
            <p className="text-sm text-muted-foreground">The document is already in this folder.</p>
          ) : null}

          {moveError === null ? null : <p className="text-sm text-destructive">{moveError}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={move.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="lg"
            disabled={isAlreadyHere || move.isPending}
            onClick={handleConfirm}
          >
            {move.isPending ? 'Moving…' : 'Move here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type PathButtonProperties = {
  label: string;
  isCurrent: boolean;
  onSelect: () => void;
};

const PathButton = ({ label, isCurrent, onSelect }: PathButtonProperties): ReactElement => (
  <button
    type="button"
    aria-current={isCurrent ? 'true' : undefined}
    disabled={isCurrent}
    className="max-w-40 shrink-0 truncate rounded-sm px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:text-muted-foreground enabled:hover:text-foreground enabled:hover:underline disabled:font-medium disabled:text-foreground"
    onClick={onSelect}
  >
    {label}
  </button>
);

const BrowserState = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export { MoveFileDialog };
