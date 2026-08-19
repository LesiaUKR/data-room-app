import { type QueryClient } from '@tanstack/react-query';

import { folderQueryKey } from '@/features/folders/hooks';
import { tsr } from '@/lib/api-client';

const fileQueryKey = (fileId: string, resource: 'detail' | 'download-url') =>
  ['files', fileId, resource] as const;

// Storage signs download URLs for 120 s; staying just under that keeps one mint per view
const DOWNLOAD_URL_STALE_MS = 90_000;

// A stats query may sit above the touched folder, so invalidate the family, not its ancestors
const invalidateFolderStats = (queryClient: QueryClient): Promise<void> =>
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === 'folders' && query.queryKey[2] === 'stats',
  });

const useFile = (fileId: string) =>
  tsr.files.getFile.useQuery({
    queryKey: fileQueryKey(fileId, 'detail'),
    queryData: { params: { fileId } },
    retry: false,
  });

// Re-minting on focus would restart the viewer's fetch of the whole document for a new URL
const useFileDownloadUrl = (fileId: string) =>
  tsr.files.getDownloadUrl.useQuery({
    queryKey: fileQueryKey(fileId, 'download-url'),
    queryData: { params: { fileId } },
    retry: false,
    staleTime: DOWNLOAD_URL_STALE_MS,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

const useFileMutations = (currentFolderId: string) => {
  const queryClient = tsr.useQueryClient();

  const invalidateContentsOf = (folderId: string): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: folderQueryKey(folderId, 'contents') });

  const rename = tsr.files.rename.useMutation({
    onSuccess: async () => {
      await invalidateContentsOf(currentFolderId);
    },
  });

  const move = tsr.files.move.useMutation({
    onSuccess: async (_response, variables) => {
      await Promise.all([
        invalidateContentsOf(currentFolderId),
        invalidateContentsOf(variables.body.folderId),
        invalidateFolderStats(queryClient),
      ]);
    },
  });

  const remove = tsr.files.remove.useMutation({
    onSuccess: async () => {
      await Promise.all([
        invalidateContentsOf(currentFolderId),
        invalidateFolderStats(queryClient),
      ]);
    },
  });

  return { rename, move, remove };
};

export {
  DOWNLOAD_URL_STALE_MS,
  fileQueryKey,
  invalidateFolderStats,
  useFile,
  useFileDownloadUrl,
  useFileMutations,
};
