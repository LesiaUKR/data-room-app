import { type ReactElement } from 'react';

import { SignOutButton } from '@/features/auth/components';
import { useSession } from '@/features/auth/hooks';

const DataRoomPage = (): ReactElement => {
  const { session } = useSession();

  if (session === null) {
    return <></>;
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{session.dataRoom.name}</h1>
          <p className="text-muted-foreground text-sm">{session.user.email}</p>
        </div>
        <SignOutButton />
      </header>
    </div>
  );
};

export { DataRoomPage };
