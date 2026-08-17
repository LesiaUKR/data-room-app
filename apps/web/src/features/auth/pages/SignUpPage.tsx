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

import { SignUpForm } from '../components/SignUpForm';

type SignUpPageProperties = {
  onSuccess: () => void;
};

const SignUpPage = ({ onSuccess }: SignUpPageProperties): ReactElement => (
  <main className="flex min-h-screen items-center justify-center p-6">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>Create your data room</h1>
        </CardTitle>
        <CardDescription>
          Your documents stay private until you share them yourself.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm onSuccess={onSuccess} />
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-foreground font-medium underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  </main>
);

export { SignUpPage };
