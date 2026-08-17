import { contentsPageSize } from '@data-room/contracts';
import { type QueryClient } from '@tanstack/react-query';

import { tsr } from '@/lib/api-client';

const folderQueryKey = (folderId: string, resource: 'contents' | 'breadcrumbs' | 'stats') =>
  ['folders', folderId, resource] as const;

const useFolderContents = (folderId: string) =>
  tsr.folders.listContents.useInfiniteQuery({
    queryKey: folderQueryKey(folderId, 'contents'),
    initialPageParam: undefined as string | undefined,
    queryData: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : undefined;

      return {
        params: { folderId },
        query: { cursor, limit: contentsPageSize.default },
      };
    },
    getNextPageParam: (lastPage: { status: number; body?: { nextCursor?: string | null } }) =>
      lastPage.status === 200 ? (lastPage.body?.nextCursor ?? undefined) : undefined,
    retry: false,
  });

const useFolderBreadcrumbs = (folderId: string) =>
  tsr.folders.listBreadcrumbs.useQuery({
    queryKey: folderQueryKey(folderId, 'breadcrumbs'),
    queryData: { params: { folderId } },
    retry: false,
  });

const useFolderStats = (folderId: string, enabled: boolean) =>
  tsr.folders.subtreeStats.useQuery({
    queryKey: folderQueryKey(folderId, 'stats'),
    queryData: { params: { folderId } },
    enabled,
    retry: false,
  });

const invalidateFolderQueries = async (
  queryClient: QueryClient,
  folderId: string,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: folderQueryKey(folderId, 'contents') }),
    queryClient.invalidateQueries({ queryKey: folderQueryKey(folderId, 'breadcrumbs') }),
    queryClient.invalidateQueries({ queryKey: folderQueryKey(folderId, 'stats') }),
  ]);
};

const hasFolderId = (item: unknown, folderId: string): boolean =>
  typeof item === 'object' && item !== null && 'id' in item && item.id === folderId;

const breadcrumbsContainFolder = (data: unknown, folderId: string): boolean => {
  if (typeof data !== 'object' || data === null || !('body' in data)) {
    return false;
  }

  const { body } = data;

  if (typeof body !== 'object' || body === null || !('items' in body)) {
    return false;
  }

  const { items } = body;

  return Array.isArray(items) && items.some((item) => hasFolderId(item, folderId));
};

const useFolderMutations = (currentFolderId: string) => {
  const queryClient = tsr.useQueryClient();

  const invalidateContents = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: folderQueryKey(currentFolderId, 'contents') });

  const invalidateContentsAndStatsOf = async (folderId: string): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: folderQueryKey(folderId, 'contents') }),
      queryClient.invalidateQueries({ queryKey: folderQueryKey(folderId, 'stats') }),
    ]);
  };

  const invalidateBreadcrumbsContaining = (folderId: string): Promise<void> =>
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'folders' &&
        query.queryKey[2] === 'breadcrumbs' &&
        breadcrumbsContainFolder(query.state.data, folderId),
    });

  const create = tsr.folders.create.useMutation({
    onSuccess: async (_response, variables) => {
      await invalidateContentsAndStatsOf(variables.body.parentFolderId);
    },
  });

  const rename = tsr.folders.rename.useMutation({
    onSuccess: async (_response, variables) => {
      await Promise.all([
        invalidateContents(),
        invalidateBreadcrumbsContaining(variables.params.folderId),
      ]);
    },
  });

  const remove = tsr.folders.remove.useMutation({
    onSuccess: async () => {
      await invalidateContentsAndStatsOf(currentFolderId);
    },
  });

  return { create, rename, remove };
};

export {
  folderQueryKey,
  invalidateFolderQueries,
  useFolderBreadcrumbs,
  useFolderContents,
  useFolderMutations,
  useFolderStats,
};
