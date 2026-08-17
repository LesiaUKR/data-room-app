import { passwordPolicy, type SignInCredentials, signInSchema } from '@data-room/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';

import { useSignIn } from '../hooks';
import { toAuthErrors } from '../utils/to-auth-error';
import { AuthField } from './AuthField';

type SignInFormProperties = {
  onSuccess: () => void;
};

const SignInForm = ({ onSuccess }: SignInFormProperties): ReactElement => {
  const signIn = useSignIn();

  const form = useForm<SignInCredentials>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const { errors } = form.formState;

  const handleSubmit = form.handleSubmit((values) => {
    signIn.mutate(
      { body: values },
      {
        onSuccess,
        onError: (error) => {
          for (const { field, message } of toAuthErrors(error)) {
            form.setError(field, { message });
          }
        },
      },
    );
  });

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="space-y-5"
      noValidate
    >
      <AuthField
        autoComplete="email"
        error={errors.email?.message}
        label="Email"
        placeholder="you@example.com"
        registration={form.register('email')}
        type="email"
      />

      <AuthField
        autoComplete="current-password"
        error={errors.password?.message}
        label="Password"
        maxLength={passwordPolicy.maxLength}
        registration={form.register('password')}
        revealable
        type="password"
      />

      {errors.root === undefined ? null : (
        <p className="text-destructive text-sm" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={signIn.isPending}>
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
};

export { SignInForm };
