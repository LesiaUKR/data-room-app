import { Link } from '@tanstack/react-router';
import { type ReactElement } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { SignInForm } from '../components/SignInForm';

type SignInPageProperties = {
  onSuccess: () => void;
};

const SignInPage = ({ onSuccess }: SignInPageProperties): ReactElement => (
  <main className="flex min-h-screen items-center justify-center p-6">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>Sign in</h1>
        </CardTitle>
        <CardDescription>Welcome back.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm onSuccess={onSuccess} />
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">
          No account yet?{' '}
          <Link to="/sign-up" className="text-foreground font-medium underline underline-offset-4">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  </main>
);

export { SignInPage };
