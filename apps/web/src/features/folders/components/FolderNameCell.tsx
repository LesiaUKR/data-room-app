import { type ContentsFolderEntry } from '@data-room/contracts';
import { Folder, Pencil } from 'lucide-react';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';

import { type NameLinkRenderer } from './contents-navigation.type';
import { FolderNameEditor } from './FolderNameEditor';

// All three arrive together or not at all: an open editor must always be closable
type FolderNameEditing = {
  parentFolderId: string;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
};

type FolderNameCellProperties = {
  folder: ContentsFolderEntry;
  renderLink: NameLinkRenderer;
  editing?: FolderNameEditing;
};

const FolderNameCell = ({
  folder,
  renderLink,
  editing,
}: FolderNameCellProperties): ReactElement => (
  <div className="relative flex min-w-0 items-center gap-3">
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
      <Folder className="size-4" aria-hidden="true" />
    </span>

    {editing?.isEditing === true ? (
      <FolderNameEditor
        folderId={folder.id}
        initialName={folder.name}
        parentFolderId={editing.parentFolderId}
        onDone={editing.onEditEnd}
      />
    ) : (
      <>
        {renderLink({
          id: folder.id,
          className:
            'truncate rounded-sm text-left font-medium outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50',
          onClick: (event) => event.stopPropagation(),
          children: folder.name,
        })}

        {editing === undefined ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 motion-reduce:transition-none"
            aria-label={`Rename ${folder.name}`}
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

export { FolderNameCell, type FolderNameEditing };
