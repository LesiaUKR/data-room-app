import { type ReactElement } from 'react';

import { Button } from '@/libs/components/ui/button';

type HealthState =
  | { kind: 'error' }
  | { kind: 'pending' }
  | { kind: 'ready'; checkedAt: string; uptimeSeconds: number };

type HealthStatusProperties = {
  onRetry: () => void;
  state: HealthState;
};

const HealthStatus = ({ onRetry, state }: HealthStatusProperties): ReactElement => {
  if (state.kind === 'pending') {
    return <p className="text-muted-foreground">Checking the API…</p>;
  }

  if (state.kind === 'error') {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-destructive">The API is unavailable right now.</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-lg font-medium">API is reachable</p>
      <p className="text-muted-foreground text-sm">
        Checked at {new Date(state.checkedAt).toLocaleTimeString()}, up for{' '}
        {state.uptimeSeconds.toFixed(1)}s
      </p>
    </div>
  );
};

export { HealthStatus, type HealthState };
