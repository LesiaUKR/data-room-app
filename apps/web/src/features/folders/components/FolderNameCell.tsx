import { type ContentsFolderEntry } from '@data-room/contracts';
import { Link } from '@tanstack/react-router';
import { Folder, Pencil } from 'lucide-react';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';

import { FolderNameEditor } from './FolderNameEditor';

type FolderNameCellProperties = {
  folder: ContentsFolderEntry;
  parentFolderId: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
};

const FolderNameCell = ({
  folder,
  parentFolderId,
  isEditing,
  onEditStart,
  onEditEnd,
}: FolderNameCellProperties): ReactElement => {
  if (isEditing) {
    return (
      <FolderNameEditor
        folderId={folder.id}
        initialName={folder.name}
        parentFolderId={parentFolderId}
        onDone={onEditEnd}
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
        <Folder className="size-4" aria-hidden="true" />
      </span>

      <Link
        to="/"
        search={{ folder: folder.id }}
        className="truncate rounded-sm text-left font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={(event) => event.stopPropagation()}
      >
        {folder.name}
      </Link>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 motion-reduce:transition-none"
        aria-label={`Rename ${folder.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onEditStart();
        }}
      >
        <Pencil aria-hidden="true" />
      </Button>
    </div>
  );
};

export { FolderNameCell };
