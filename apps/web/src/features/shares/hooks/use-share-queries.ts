import { sharesPageSize, type ShareTarget } from '@data-room/contracts';

import { tsr } from '@/lib/api-client';

// Two dialogs open on different resources must not read each other's grants
const shareQueryKey = (target: ShareTarget) => ['shares', target.kind, target.id] as const;

const useShares = (target: ShareTarget, enabled: boolean) =>
  tsr.shares.list.useInfiniteQuery({
    queryKey: shareQueryKey(target),
    initialPageParam: undefined as string | undefined,
    queryData: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : undefined;

      return {
        query: {
          targetKind: target.kind,
          targetId: target.id,
          cursor,
          limit: sharesPageSize.default,
        },
      };
    },
    getNextPageParam: (lastPage: { status: number; body?: { nextCursor?: string | null } }) =>
      lastPage.status === 200 ? (lastPage.body?.nextCursor ?? undefined) : undefined,
    enabled,
    retry: false,
  });

const useShareMutations = (target: ShareTarget) => {
  const queryClient = tsr.useQueryClient();

  const invalidateSharesOf = (of: ShareTarget): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: shareQueryKey(of) });

  const create = tsr.shares.create.useMutation({
    // The request carries its own target, so the refetched list is the one that changed
    onSuccess: async (_response, variables) => {
      await invalidateSharesOf(variables.body.target);
    },
  });

  const revoke = tsr.shares.revoke.useMutation({
    // A 204 has no body to identify the list from, so the dialog's target is the only source
    onSuccess: async () => {
      await invalidateSharesOf(target);
    },
  });

  return { create, revoke };
};

export { shareQueryKey, useShareMutations, useShares };
