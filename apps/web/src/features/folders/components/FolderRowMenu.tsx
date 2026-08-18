import { MoreVertical, Pencil, Share2, Trash2 } from 'lucide-react';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FolderRowMenuProperties = {
  folderName: string;
  onRename: () => void;
  onShare: () => void;
  onDelete: () => void;
};

const FolderRowMenu = ({
  folderName,
  onRename,
  onShare,
  onDelete,
}: FolderRowMenuProperties): ReactElement => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="touch-manipulation"
        aria-label={`More actions for ${folderName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVertical aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenuItem onSelect={onRename}>
        <Pencil aria-hidden="true" />
        Rename
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={onShare}>
        <Share2 aria-hidden="true" />
        Share…
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2 aria-hidden="true" />
        Delete folder…
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export { FolderRowMenu };
