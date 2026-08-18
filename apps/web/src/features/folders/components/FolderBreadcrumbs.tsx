import { Link } from '@tanstack/react-router';
import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

import { useFolderBreadcrumbs } from '../hooks';
import { toFolderFailure } from '../utils/to-folder-error';

type FolderBreadcrumbsProperties = {
  currentFolderId: string;
  rootFolderId: string;
};

const FolderBreadcrumbs = ({
  currentFolderId,
  rootFolderId,
}: FolderBreadcrumbsProperties): ReactElement => {
  const breadcrumbs = useFolderBreadcrumbs(currentFolderId);
  const isRoot = currentFolderId === rootFolderId;

  const items = breadcrumbs.data?.status === 200 ? breadcrumbs.data.body.items : [];

  return (
    <nav
      aria-label="Folder breadcrumbs"
      className="flex items-center gap-1 overflow-x-auto overflow-y-hidden"
    >
      <Button asChild variant={isRoot ? 'secondary' : 'ghost'} size="sm">
        <Link to="/" search={{}}>
          My data room
        </Link>
      </Button>

      {isRoot ? null : <Trail breadcrumbs={breadcrumbs} items={items} />}
    </nav>
  );
};

type TrailProperties = {
  breadcrumbs: ReturnType<typeof useFolderBreadcrumbs>;
  items: { id: string; name: string }[];
};

const Trail = ({ breadcrumbs, items }: TrailProperties): ReactElement => {
  if (breadcrumbs.isPending) {
    return (
      <Segment>
        <span className="px-2 text-sm text-muted-foreground">Loading path…</span>
      </Segment>
    );
  }

  if (breadcrumbs.isError) {
    const failure = toFolderFailure(breadcrumbs.error);

    if (failure === 'missing' || failure === 'forbidden') {
      return (
        <Segment>
          <span className="px-2 text-sm text-muted-foreground">Unavailable</span>
        </Segment>
      );
    }

    return (
      <Segment>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => void breadcrumbs.refetch()}
        >
          Path unavailable — retry
        </Button>
      </Segment>
    );
  }

  return (
    <>
      {items.map((item, index) => (
        <Segment key={item.id}>
          <Button asChild variant={index === items.length - 1 ? 'secondary' : 'ghost'} size="sm">
            <Link to="/" search={{ folder: item.id }}>
              {item.name}
            </Link>
          </Button>
        </Segment>
      ))}
    </>
  );
};

const Segment = ({ children }: { children: ReactNode }): ReactElement => (
  <span className="flex items-center gap-1">
    <span aria-hidden="true" className="text-muted-foreground">
      /
    </span>
    {children}
  </span>
);

export { FolderBreadcrumbs };
