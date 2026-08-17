import { type ContentsFolderEntry } from '@data-room/contracts';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { tsr } from '@/lib/api-client';
import { formatBytes } from '@/lib/format-bytes';

import { invalidateFolderQueries, useFolderMutations, useFolderStats } from '../hooks';
import { toFolderErrors, toFolderFailure } from '../utils/to-folder-error';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

type DeleteFolderDialogProperties = {
  folder: ContentsFolderEntry;
  parentFolderId: string;
  onClose: () => void;
};

const DeleteFolderDialog = ({
  folder,
  parentFolderId,
  onClose,
}: DeleteFolderDialogProperties): ReactElement => {
  const queryClient = tsr.useQueryClient();
  const { remove } = useFolderMutations(parentFolderId);
  const stats = useFolderStats(folder.id, true);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const totals = stats.data?.status === 200 ? stats.data.body : null;
  const statsFailure = stats.isError ? toFolderFailure(stats.error) : null;

  const isAlreadyGone = statsFailure === 'missing';

  const hasCurrentTotals = totals !== null && !stats.isError && !stats.isFetching;

  useEffect(() => {
    if (isAlreadyGone) {
      onClose();
      void invalidateFolderQueries(queryClient, parentFolderId);
    }
  }, [isAlreadyGone, onClose, parentFolderId, queryClient]);

  const handleConfirm = (): void => {
    setDeleteError(null);

    remove.mutate(
      { params: { folderId: folder.id } },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          if (toFolderFailure(error) === 'missing') {
            onClose();
            void invalidateFolderQueries(queryClient, parentFolderId);

            return;
          }

          const [first] = toFolderErrors(error);
          setDeleteError(first?.message ?? FALLBACK_ERROR);
        },
      },
    );
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      title={`Delete “${folder.name}”?`}
      description={
        <div className="flex flex-col gap-3">
          <div aria-live="polite" aria-busy={stats.isFetching}>
            <FolderContentsSummary
              totals={totals}
              isFetching={stats.isFetching}
              hasFailed={statsFailure !== null && !isAlreadyGone}
              onRetry={() => void stats.refetch()}
            />
          </div>

          <div aria-live="polite">
            {deleteError === null ? null : (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>
        </div>
      }
      confirmLabel="Delete folder"
      pendingLabel="Deleting…"
      isPending={remove.isPending}
      isConfirmDisabled={!hasCurrentTotals}
      variant="destructive"
      onConfirm={handleConfirm}
    />
  );
};

type FolderContentsSummaryProperties = {
  totals: { folderCount: number; fileCount: number; totalBytes: string } | null;
  isFetching: boolean;
  hasFailed: boolean;
  onRetry: () => void;
};

const FolderContentsSummary = ({
  totals,
  isFetching,
  hasFailed,
  onRetry,
}: FolderContentsSummaryProperties): ReactElement => {
  if (isFetching) {
    return (
      <div className="flex flex-col gap-3">
        <p>This folder and everything in it will be deleted. This cannot be undone.</p>
        <p className="sr-only">Checking what this folder contains…</p>

        <TotalsList
          subfolders={<LoadingValue />}
          files={<LoadingValue />}
          size={<LoadingValue />}
        />
      </div>
    );
  }

  if (hasFailed || totals === null) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p>We could not check what this folder contains, so deleting is blocked for now.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p>This folder and everything in it will be deleted. This cannot be undone.</p>

      <TotalsList
        subfolders={totals.folderCount}
        files={totals.fileCount}
        size={formatBytes(totals.totalBytes)}
      />
    </div>
  );
};

type TotalsListProperties = {
  subfolders: ReactNode;
  files: ReactNode;
  size: ReactNode;
};

const TotalsList = ({ subfolders, files, size }: TotalsListProperties): ReactElement => (
  <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 rounded-lg border bg-muted/40 px-3 py-2.5">
    <dt>Subfolders</dt>
    <dd className="text-right font-medium text-foreground tabular-nums">{subfolders}</dd>

    <dt>Files</dt>
    <dd className="text-right font-medium text-foreground tabular-nums">{files}</dd>

    <dt>Size</dt>
    <dd className="text-right font-medium text-foreground tabular-nums">{size}</dd>
  </dl>
);

const LoadingValue = (): ReactElement => (
  <span
    aria-hidden="true"
    className="inline-block h-4 w-10 animate-pulse rounded bg-muted-foreground/20 align-middle motion-reduce:animate-none"
  />
);

export { DeleteFolderDialog };
