import { renameFileSchema } from '@data-room/contracts';
import { useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import { Input } from '@/components/ui/input';

import { useFileMutations } from '../hooks';
import { toFileErrorMessage } from '../utils/to-file-error';

const INVALID_NAME_ERROR = 'This name is not allowed.';

type FileNameEditorProperties = {
  fileId: string;
  initialName: string;
  folderId: string;
  onDone: () => void;
};

const FileNameEditor = ({
  fileId,
  initialName,
  folderId,
  onDone,
}: FileNameEditorProperties): ReactElement => {
  const { rename } = useFileMutations(folderId);

  const [draft, setDraft] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  // A useState flag would still read false inside the same synchronous blur handler
  const isCancelledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const failEditing = (message: string): void => {
    setError(message);

    globalThis.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleBlur = (): void => {
    if (rename.isPending) {
      return;
    }

    if (isCancelledRef.current || draft.trim().length === 0) {
      onDone();

      return;
    }

    const parsed = renameFileSchema.safeParse({ name: draft });

    if (!parsed.success) {
      failEditing(parsed.error.issues[0]?.message ?? INVALID_NAME_ERROR);

      return;
    }

    if (parsed.data.name === initialName) {
      onDone();

      return;
    }

    rename.mutate(
      { params: { fileId }, body: parsed.data },
      {
        onSuccess: () => {
          onDone();
        },
        onError: (mutationError) => {
          failEditing(toFileErrorMessage(mutationError));
        },
      },
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      isCancelledRef.current = true;
      event.currentTarget.blur();

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <Input
        ref={inputRef}
        autoComplete="off"
        aria-label={`Rename ${initialName}`}
        aria-invalid={error !== null}
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />

      <div aria-live="polite" className="absolute top-full right-0 left-0 z-10 mt-1">
        {error === null ? null : (
          <p className="rounded-md border border-destructive/40 bg-background px-2 py-1 text-xs text-destructive shadow-md">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export { FileNameEditor };
