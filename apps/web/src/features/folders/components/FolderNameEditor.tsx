import { renameFolderSchema } from '@data-room/contracts';
import { useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import { Input } from '@/components/ui/input';

import { useFolderMutations } from '../hooks';
import { toFolderErrors } from '../utils/to-folder-error';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';
const INVALID_NAME_ERROR = 'This name is not allowed.';

type FolderNameEditorProperties = {
  folderId: string;
  initialName: string;
  parentFolderId: string;
  onDone: () => void;
};

const FolderNameEditor = ({
  folderId,
  initialName,
  parentFolderId,
  onDone,
}: FolderNameEditorProperties): ReactElement => {
  const { rename } = useFolderMutations(parentFolderId);

  const [draft, setDraft] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

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

    const parsed = renameFolderSchema.safeParse({ name: draft });

    if (!parsed.success) {
      failEditing(parsed.error.issues[0]?.message ?? INVALID_NAME_ERROR);

      return;
    }

    if (parsed.data.name === initialName) {
      onDone();

      return;
    }

    rename.mutate(
      { params: { folderId }, body: parsed.data },
      {
        onSuccess: () => {
          onDone();
        },
        onError: (mutationError) => {
          const [first] = toFolderErrors(mutationError);
          failEditing(first?.message ?? FALLBACK_ERROR);
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
    <div className="flex min-w-0 flex-col gap-1">
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

      <div aria-live="polite">
        {error === null ? null : <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
};

export { FolderNameEditor };
