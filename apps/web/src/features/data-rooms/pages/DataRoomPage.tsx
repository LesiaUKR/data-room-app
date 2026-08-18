import { ResourceKind } from '@data-room/contracts';
import { Share2 } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/features/auth/components';
import { useSession } from '@/features/auth/hooks';
import { FolderPage } from '@/features/folders/pages/FolderPage';
import { ShareDialog } from '@/features/shares/components';

const DataRoomPage = (): ReactElement => {
  const { session } = useSession();
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (session === null) {
    return <></>;
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{session.dataRoom.name}</h1>
          <p className="text-muted-foreground truncate text-sm">{session.user.email}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setIsShareOpen(true)}>
            <Share2 aria-hidden="true" />
            Share
          </Button>

          <SignOutButton />
        </div>
      </header>

      <FolderPage rootFolderId={session.dataRoom.rootFolderId} />

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        target={{ kind: ResourceKind.DATA_ROOM, id: session.dataRoom.id }}
        resourceName={session.dataRoom.name}
      />
    </div>
  );
};

export { DataRoomPage };
