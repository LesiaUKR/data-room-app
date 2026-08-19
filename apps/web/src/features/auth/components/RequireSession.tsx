import { Navigate, useRouterState } from '@tanstack/react-router';
import { type PropsWithChildren, type ReactElement } from 'react';

import { FullPageMessage } from '@/components/FullPageMessage';
import { Button } from '@/components/ui/button';

import { useSession } from '../hooks';
import { DEFAULT_RETURN_TO, toInternalPath } from '../utils/return-to';

const RequireSession = ({ children }: PropsWithChildren): ReactElement => {
  const { refetch, session, status } = useSession();

  /**
   * The deep link the visitor asked for, sanitised at the source. Collapsing an auth path to the
   * default here is what keeps the redirect target stable: without it, redirecting away from "/"
   * would feed its own target back in and nest another returnTo on every render. Omitting the
   * default also keeps the ordinary sign-in URL clean, since "/" is where sign-in lands anyway.
   */
  const returnTo = useRouterState({
    select: (state) => {
      const path = toInternalPath(state.location.href);

      return path === DEFAULT_RETURN_TO ? undefined : path;
    },
  });

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
    return <Navigate to="/sign-in" search={{ returnTo }} replace />;
  }

  return <>{children}</>;
};

export { RequireSession };
