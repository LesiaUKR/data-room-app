import { type ContentsFileEntry } from '@data-room/contracts';
import { Link } from '@tanstack/react-router';
import { FileText, Pencil } from 'lucide-react';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';

import { FileNameEditor } from './FileNameEditor';

type FileNameCellProperties = {
  file: ContentsFileEntry;
  folderId: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
};

const FileNameCell = ({
  file,
  folderId,
  isEditing,
  onEditStart,
  onEditEnd,
}: FileNameCellProperties): ReactElement => (
  <div className="relative flex min-w-0 items-center gap-3">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
      <FileText className="size-4" aria-hidden="true" />
    </span>

    {isEditing ? (
      <FileNameEditor
        fileId={file.id}
        initialName={file.name}
        folderId={folderId}
        onDone={onEditEnd}
      />
    ) : (
      <>
        <Link
          to="/files/$fileId"
          params={{ fileId: file.id }}
          target="_blank"
          rel="noreferrer"
          className="truncate rounded-sm text-left font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={(event) => event.stopPropagation()}
        >
          {file.name}
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 motion-reduce:transition-none"
          aria-label={`Rename ${file.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onEditStart();
          }}
        >
          <Pencil aria-hidden="true" />
        </Button>
      </>
    )}
  </div>
);

export { FileNameCell };
