import { type Credentials, credentialsSchema, passwordPolicy } from '@data-room/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';

import { useSignUp } from '../hooks';
import { toAuthErrors } from '../utils/to-auth-error';
import { AuthField } from './AuthField';
import { PasswordChecklist } from './PasswordChecklist';

type SignUpFormProperties = {
  onSuccess: () => void;
};

const SignUpForm = ({ onSuccess }: SignUpFormProperties): ReactElement => {
  const signUp = useSignUp();

  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const password = form.watch('password') ?? '';
  const { errors } = form.formState;

  const handleSubmit = form.handleSubmit((values) => {
    signUp.mutate(
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
        autoComplete="new-password"
        error={errors.password?.message}
        label="Password"
        maxLength={passwordPolicy.maxLength}
        registration={form.register('password')}
        revealable
        type="password"
      >
        <PasswordChecklist value={password} />
      </AuthField>

      {errors.root === undefined ? null : (
        <p className="text-destructive text-sm" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={signUp.isPending}>
        {signUp.isPending ? 'Creating your data room…' : 'Create account'}
      </Button>
    </form>
  );
};

export { SignUpForm };
