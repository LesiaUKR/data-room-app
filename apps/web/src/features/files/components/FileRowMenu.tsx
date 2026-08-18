import { ExternalLink, FolderInput, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FileRowMenuProperties = {
  fileName: string;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
};

const FileRowMenu = ({
  fileName,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: FileRowMenuProperties): ReactElement => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="touch-manipulation"
        aria-label={`More actions for ${fileName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVertical aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenuItem onSelect={onOpen}>
        <ExternalLink aria-hidden="true" />
        Open in a new tab
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={onRename}>
        <Pencil aria-hidden="true" />
        Rename
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={onMove}>
        <FolderInput aria-hidden="true" />
        Move to…
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2 aria-hidden="true" />
        Delete file…
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export { FileRowMenu };
