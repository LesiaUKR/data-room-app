import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

type BreadcrumbItem = {
  id: string;
  name: string;
};

// Only the states the trail can actually be in: never pending and ready, never retry without a failure
type BreadcrumbTrail =
  | { status: 'hidden' }
  | { status: 'pending' }
  | { status: 'unavailable' }
  | { status: 'failed'; onRetry: () => void }
  | { status: 'ready'; items: BreadcrumbItem[] };

type FolderBreadcrumbsProperties = {
  trail: BreadcrumbTrail;
  renderItem: (item: BreadcrumbItem, isCurrent: boolean) => ReactElement;
  renderHome?: () => ReactElement;
};

const FolderBreadcrumbs = ({
  trail,
  renderItem,
  renderHome,
}: FolderBreadcrumbsProperties): ReactElement => (
  <nav
    aria-label="Folder breadcrumbs"
    className="flex items-center gap-1 overflow-x-auto overflow-y-hidden"
  >
    {renderHome === undefined ? null : renderHome()}

    <Trail trail={trail} renderItem={renderItem} hasLeading={renderHome !== undefined} />
  </nav>
);

type TrailProperties = {
  trail: BreadcrumbTrail;
  renderItem: (item: BreadcrumbItem, isCurrent: boolean) => ReactElement;
  hasLeading: boolean;
};

const Trail = ({ trail, renderItem, hasLeading }: TrailProperties): ReactElement | null => {
  if (trail.status === 'hidden') {
    return null;
  }

  if (trail.status === 'pending') {
    return (
      <Segment withSeparator={hasLeading}>
        <span className="px-2 text-sm text-muted-foreground">Loading path…</span>
      </Segment>
    );
  }

  if (trail.status === 'unavailable') {
    return (
      <Segment withSeparator={hasLeading}>
        <span className="px-2 text-sm text-muted-foreground">Unavailable</span>
      </Segment>
    );
  }

  if (trail.status === 'failed') {
    return (
      <Segment withSeparator={hasLeading}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={trail.onRetry}
        >
          Path unavailable — retry
        </Button>
      </Segment>
    );
  }

  return (
    <>
      {trail.items.map((item, index) => (
        <Segment key={item.id} withSeparator={hasLeading || index > 0}>
          {renderItem(item, index === trail.items.length - 1)}
        </Segment>
      ))}
    </>
  );
};

type SegmentProperties = {
  children: ReactNode;
  withSeparator: boolean;
};

const Segment = ({ children, withSeparator }: SegmentProperties): ReactElement => (
  <span className="flex items-center gap-1">
    {withSeparator ? (
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
    ) : null}
    {children}
  </span>
);

export { FolderBreadcrumbs, type BreadcrumbItem, type BreadcrumbTrail };
