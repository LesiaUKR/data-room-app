import { type ContentsFileEntry } from '@data-room/contracts';
import { FileText, Pencil } from 'lucide-react';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { type NameLinkRenderer } from '@/features/folders/components/contents-navigation.type';

import { FileNameEditor } from './FileNameEditor';

type FileNameEditing = {
  folderId: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
};

type FileNameCellProperties = {
  file: ContentsFileEntry;
  renderLink: NameLinkRenderer;
  editing?: FileNameEditing;
};

const FileNameCell = ({ file, renderLink, editing }: FileNameCellProperties): ReactElement => (
  <div className="relative flex min-w-0 items-center gap-3">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
      <FileText className="size-4" aria-hidden="true" />
    </span>

    {editing?.isEditing === true ? (
      <FileNameEditor
        fileId={file.id}
        initialName={file.name}
        folderId={editing.folderId}
        onDone={editing.onEditEnd}
      />
    ) : (
      <>
        {renderLink({
          id: file.id,
          className:
            'truncate rounded-sm text-left font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50',
          onClick: (event) => event.stopPropagation(),
          children: file.name,
        })}

        {editing === undefined ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 motion-reduce:transition-none"
            aria-label={`Rename ${file.name}`}
            onClick={(event) => {
              event.stopPropagation();
              editing.onEditStart();
            }}
          >
            <Pencil aria-hidden="true" />
          </Button>
        )}
      </>
    )}
  </div>
);

export { FileNameCell, type FileNameEditing };
