import { Navigate } from '@tanstack/react-router';
import { type PropsWithChildren, type ReactElement } from 'react';

import { FullPageMessage } from '@/components/FullPageMessage';

import { useSession } from '../hooks';

const RequireAnonymous = ({ children }: PropsWithChildren): ReactElement => {
  const { session, status } = useSession();

  if (status === 'pending') {
    return <FullPageMessage>Checking your session…</FullPageMessage>;
  }

  if (status === 'authenticated' && session !== null) {
    return <Navigate to="/" replace />;
  }

  // On an unreachable server the auth form is still the useful screen, so `error` falls through
  return <>{children}</>;
};

export { RequireAnonymous };
