import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { type ReactElement } from 'react';

import { HealthPage } from '@/modules/health/pages/HealthPage';

const RootLayout = (): ReactElement => <Outlet />;

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HealthPage,
});

const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });

export { router };
