import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { type ReactElement } from 'react';

import { RequireAnonymous, RequireSession } from '@/features/auth/components';
import { SignInPage } from '@/features/auth/pages/SignInPage';
import { SignUpPage } from '@/features/auth/pages/SignUpPage';
import { DataRoomPage } from '@/features/data-rooms/pages/DataRoomPage';
import { HealthPage } from '@/features/health/pages/HealthPage';

const RootLayout = (): ReactElement => <Outlet />;

const ProtectedDataRoom = (): ReactElement => (
  <RequireSession>
    <DataRoomPage />
  </RequireSession>
);

const SignInScreen = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <RequireAnonymous>
      <SignInPage
        onSuccess={() => {
          void navigate({ to: '/', replace: true });
        }}
      />
    </RequireAnonymous>
  );
};

const SignUpScreen = (): ReactElement => {
  const navigate = useNavigate();

  return (
    <RequireAnonymous>
      <SignUpPage
        onSuccess={() => {
          void navigate({ to: '/', replace: true });
        }}
      />
    </RequireAnonymous>
  );
};

const rootRoute = createRootRoute({ component: RootLayout });

const dataRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ProtectedDataRoom,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInScreen,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpScreen,
});

const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/health',
  component: HealthPage,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([dataRoomRoute, signInRoute, signUpRoute, healthRoute]),
});

export { router };
