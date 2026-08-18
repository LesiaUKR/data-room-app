import { type ContentsFileEntry } from '@data-room/contracts';
import { useState, type ReactElement } from 'react';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatBytes } from '@/lib/format-bytes';

import { useFileMutations } from '../hooks';
import { toFileErrorMessage, toFileFailure } from '../utils/to-file-error';

type DeleteFileDialogProperties = {
  file: ContentsFileEntry;
  currentFolderId: string;
  onClose: () => void;
};

const DeleteFileDialog = ({
  file,
  currentFolderId,
  onClose,
}: DeleteFileDialogProperties): ReactElement => {
  const { remove } = useFileMutations(currentFolderId);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirm = (): void => {
    setDeleteError(null);

    remove.mutate(
      { params: { fileId: file.id } },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error) => {
          // Someone else already deleted it, so the intended end state is reached
          if (toFileFailure(error) === 'missing') {
            onClose();

            return;
          }

          setDeleteError(toFileErrorMessage(error));
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
      title={`Delete “${file.name}”?`}
      description={
        <div className="flex flex-col gap-3">
          <p>
            This document and all of its versions will be deleted ({formatBytes(file.sizeBytes)}).
            This cannot be undone.
          </p>

          <div aria-live="polite">
            {deleteError === null ? null : <p className="text-destructive">{deleteError}</p>}
          </div>
        </div>
      }
      confirmLabel="Delete file"
      pendingLabel="Deleting…"
      isPending={remove.isPending}
      variant="destructive"
      onConfirm={handleConfirm}
    />
  );
};

export { DeleteFileDialog };
