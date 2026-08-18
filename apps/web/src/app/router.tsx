import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { type ReactElement } from 'react';
import { z } from 'zod';

import { RequireAnonymous, RequireSession } from '@/features/auth/components';
import { toInternalPath } from '@/features/auth/utils/return-to';
import { FileViewerPage } from '@/features/files/pages/FileViewerPage';
import { SignInPage } from '@/features/auth/pages/SignInPage';
import { SignUpPage } from '@/features/auth/pages/SignUpPage';
import { DataRoomPage } from '@/features/data-rooms/pages/DataRoomPage';
import { SharedFolderPage } from '@/features/folders/pages/SharedFolderPage';
import { HealthPage } from '@/features/health/pages/HealthPage';
import { PublicFileViewerPage } from '@/features/shares/pages/PublicFileViewerPage';
import { PublicSharePage } from '@/features/shares/pages/PublicSharePage';

const RootLayout = (): ReactElement => <Outlet />;

const ProtectedDataRoom = (): ReactElement => (
  <RequireSession>
    <DataRoomPage />
  </RequireSession>
);

const ProtectedFileViewer = (): ReactElement => {
  const { fileId } = fileRoute.useParams();
  const origin = fileRoute.useSearch();

  return (
    <RequireSession>
      <FileViewerPage fileId={fileId} origin={origin} />
    </RequireSession>
  );
};

const ProtectedSharedFolder = (): ReactElement => {
  const { folderId } = sharedFolderRoute.useParams();

  return (
    <RequireSession>
      <SharedFolderPage folderId={folderId} />
    </RequireSession>
  );
};

const SignInScreen = (): ReactElement => {
  const navigate = useNavigate();
  const { returnTo } = signInRoute.useSearch();

  return (
    <RequireAnonymous>
      <SignInPage
        onSuccess={() => {
          // Validated here, never trusted: `href` navigation would follow an external target
          void navigate({ href: toInternalPath(returnTo), replace: true });
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

// Deliberately outside RequireSession: the route decides the principal, so a signed-in visitor
// opening a public link is still treated as anonymous
const PublicShareScreen = (): ReactElement => {
  const { token } = publicShareRoute.useParams();
  const { folder } = publicShareRoute.useSearch();

  return <PublicSharePage token={token} folderId={folder} />;
};

const PublicShareFileScreen = (): ReactElement => {
  const { token, fileId } = publicShareFileRoute.useParams();

  return <PublicFileViewerPage token={token} fileId={fileId} />;
};

const rootRoute = createRootRoute({ component: RootLayout });

const dataRoomSearchSchema = z.object({
  folder: z.string().uuid().optional(),
});

const dataRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ProtectedDataRoom,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = dataRoomSearchSchema.safeParse(search);

    return parsed.success ? parsed.data : {};
  },
});

// Where the reader came from, so the viewer can offer a way back that a new tab has no history for
const fileSearchSchema = z.object({
  from: z.enum(['room', 'shared']).optional(),
  folder: z.string().uuid().optional(),
});

// Its own URL, so a document opens in a new tab and survives a refresh or a pasted link
const fileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files/$fileId',
  component: ProtectedFileViewer,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = fileSearchSchema.safeParse(search);

    return parsed.success ? parsed.data : {};
  },
});

// A folder shared with this user: read-only, and rooted at the folder itself
const sharedFolderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/folders/$folderId',
  component: ProtectedSharedFolder,
});

const signInSearchSchema = z.object({
  returnTo: z.string().optional(),
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  component: SignInScreen,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = signInSearchSchema.safeParse(search);

    return parsed.success ? parsed.data : {};
  },
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  component: SignUpScreen,
});

const publicShareSearchSchema = z.object({
  folder: z.string().uuid().optional(),
});

// The token identifies the whole shared view; the folder is a position inside it
const publicShareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$token',
  component: PublicShareScreen,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = publicShareSearchSchema.safeParse(search);

    return parsed.success ? parsed.data : {};
  },
});

// A document is a different screen with different queries, so it gets its own path
const publicShareFileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/$token/files/$fileId',
  component: PublicShareFileScreen,
});

const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/health',
  component: HealthPage,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([
    dataRoomRoute,
    fileRoute,
    publicShareRoute,
    publicShareFileRoute,
    sharedFolderRoute,
    signInRoute,
    signUpRoute,
    healthRoute,
  ]),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export { router };
