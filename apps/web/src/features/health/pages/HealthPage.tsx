import { type ReactElement } from 'react';

import { tsr } from '@/lib/api-client';

import { HealthStatus, type HealthState } from '../components/HealthStatus';

const HEALTH_QUERY_KEY = ['health'];

const HealthPage = (): ReactElement => {
  const { data, isError, isPending, refetch } = tsr.health.check.useQuery({
    queryKey: HEALTH_QUERY_KEY,
  });

  const state: HealthState = isPending
    ? { kind: 'pending' }
    : isError || !data
      ? { kind: 'error' }
      : {
          kind: 'ready',
          checkedAt: data.body.timestamp,
          uptimeSeconds: data.body.uptimeSeconds,
        };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-2xl font-semibold">Data Room</h1>
      <HealthStatus
        onRetry={() => {
          void refetch();
        }}
        state={state}
      />
    </main>
  );
};

export { HealthPage };
