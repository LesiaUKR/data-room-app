import { contentsPageSize } from '@data-room/contracts';

import { DOWNLOAD_URL_STALE_MS } from '@/features/files/hooks';
import { tsr } from '@/lib/api-client';

/**
 * The token is part of the identity. Two different public grants can point at the same folder,
 * and each resolves to its own clamped view, so they must never share one cache entry.
 */
const publicShareQueryKey = (token: string, parts: readonly string[]) =>
  ['public-shares', token, ...parts] as const;

const usePublicShare = (token: string) =>
  tsr.publicShares.resolve.useQuery({
    queryKey: publicShareQueryKey(token, ['share']),
    queryData: { params: { token } },
    retry: false,
  });

const usePublicFolderContents = (token: string, folderId: string) =>
  tsr.publicShares.listContents.useInfiniteQuery({
    queryKey: publicShareQueryKey(token, ['folder', folderId, 'contents']),
    initialPageParam: undefined as string | undefined,
    queryData: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : undefined;

      return {
        params: { token, folderId },
        query: { cursor, limit: contentsPageSize.default },
      };
    },
    getNextPageParam: (lastPage: { status: number; body?: { nextCursor?: string | null } }) =>
      lastPage.status === 200 ? (lastPage.body?.nextCursor ?? undefined) : undefined,
    retry: false,
  });

const usePublicFolderBreadcrumbs = (token: string, folderId: string) =>
  tsr.publicShares.listBreadcrumbs.useQuery({
    queryKey: publicShareQueryKey(token, ['folder', folderId, 'breadcrumbs']),
    queryData: { params: { token, folderId } },
    retry: false,
  });

const usePublicFile = (token: string, fileId: string) =>
  tsr.publicShares.getFile.useQuery({
    queryKey: publicShareQueryKey(token, ['file', fileId, 'detail']),
    queryData: { params: { token, fileId } },
    retry: false,
  });

// Same reasoning as the authenticated viewer: the bytes live in a local blob URL, so re-minting
// on focus would cost the whole document again for nothing
const usePublicFileDownloadUrl = (token: string, fileId: string) =>
  tsr.publicShares.getDownloadUrl.useQuery({
    queryKey: publicShareQueryKey(token, ['file', fileId, 'download-url']),
    queryData: { params: { token, fileId } },
    retry: false,
    staleTime: DOWNLOAD_URL_STALE_MS,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export {
  publicShareQueryKey,
  usePublicFile,
  usePublicFileDownloadUrl,
  usePublicFolderBreadcrumbs,
  usePublicFolderContents,
  usePublicShare,
};
