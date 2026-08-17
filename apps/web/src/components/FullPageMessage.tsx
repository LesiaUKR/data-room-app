import { type PropsWithChildren, type ReactElement, type ReactNode } from 'react';

type FullPageMessageProperties = PropsWithChildren<{
  action?: ReactNode;
}>;

// `role="status"` announces the swap between "checking", "unreachable" and back after a retry
const FullPageMessage = ({ action, children }: FullPageMessageProperties): ReactElement => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
  >
    <p className="text-muted-foreground text-sm">{children}</p>
    {action}
  </div>
);

export { FullPageMessage };
