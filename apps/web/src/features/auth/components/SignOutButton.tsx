import { useNavigate } from '@tanstack/react-router';
import { type ReactElement } from 'react';

import { Button } from '@/components/ui/button';

import { useSignOut } from '../hooks';

const SIGN_OUT_FAILED_MESSAGE = 'Sign-out failed. You are still signed in.';

const SignOutButton = (): ReactElement => {
  const navigate = useNavigate();
  const signOut = useSignOut();

  const requestSignOut = (): void => {
    signOut.mutate(
      {},
      {
        onSuccess: () => {
          void navigate({ to: '/sign-in', replace: true });
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3">
      {signOut.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {SIGN_OUT_FAILED_MESSAGE}
        </p>
      ) : null}
      <Button variant="outline" disabled={signOut.isPending} onClick={requestSignOut}>
        {signOut.isPending ? 'Signing out…' : signOut.isError ? 'Try again' : 'Sign out'}
      </Button>
    </div>
  );
};

export { SignOutButton };
