import { Navigate } from '@tanstack/react-router';
import { type PropsWithChildren, type ReactElement } from 'react';

import { FullPageMessage } from '@/components/FullPageMessage';
import { Button } from '@/components/ui/button';

import { useSession } from '../hooks';

const RequireSession = ({ children }: PropsWithChildren): ReactElement => {
  const { refetch, session, status } = useSession();

  if (status === 'pending') {
    return <FullPageMessage>Checking your session…</FullPageMessage>;
  }

  // A server or network failure is not a sign-out: offering sign-in here would be a lie
  if (status === 'error') {
    return (
      <FullPageMessage action={<Button onClick={refetch}>Try again</Button>}>
        We could not reach the server to check your session.
      </FullPageMessage>
    );
  }

  if (status === 'anonymous' || session === null) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

export { RequireSession };
