import { type SessionResponse } from '@data-room/contracts';
import { useEffect } from 'react';

import { tsr } from '@/lib/api-client';

const SESSION_QUERY_KEY = ['session'];

const SESSION_STALE_TIME_MINUTES = 5;
const MILLISECONDS_PER_MINUTE = 60_000;
const SESSION_STALE_TIME_MS = SESSION_STALE_TIME_MINUTES * MILLISECONDS_PER_MINUTE;

const UNAUTHORIZED_STATUS = 401;

type SessionStatus = 'anonymous' | 'authenticated' | 'error' | 'pending';

type SessionState = {
  refetch: () => void;
  session: SessionResponse | null;
  status: SessionStatus;
};

const isUnauthorized = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  error.status === UNAUTHORIZED_STATUS;

const resolveStatus = (input: {
  error: unknown;
  hasData: boolean;
  isPending: boolean;
}): SessionStatus => {
  if (input.isPending) {
    return 'pending';
  }

  // A 401 overrides cached data: an expired cookie must never keep the room on screen
  if (isUnauthorized(input.error)) {
    return 'anonymous';
  }

  if (input.error !== null && input.error !== undefined) {
    return 'error';
  }

  return input.hasData ? 'authenticated' : 'anonymous';
};

const useSession = (): SessionState => {
  const queryClient = tsr.useQueryClient();

  const { data, error, isPending, refetch } = tsr.auth.me.useQuery({
    queryKey: SESSION_QUERY_KEY,
    retry: false,
    staleTime: SESSION_STALE_TIME_MS,
  });

  const status = resolveStatus({ error, hasData: data !== undefined, isPending });

  const hasStaleSession = status === 'anonymous' && data !== undefined;

  useEffect(() => {
    if (hasStaleSession) {
      queryClient.clear();
    }
  }, [hasStaleSession, queryClient]);

  return {
    refetch: () => {
      void refetch();
    },
    session: status === 'authenticated' ? (data?.body ?? null) : null,
    status,
  };
};

export { SESSION_QUERY_KEY, useSession, type SessionState, type SessionStatus };
