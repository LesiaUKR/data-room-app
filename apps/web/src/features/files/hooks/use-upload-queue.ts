import { resourceNameSchema, uploadLimits, type UploadMode } from '@data-room/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { folderQueryKey } from '@/features/folders/hooks';
import { tsr } from '@/lib/api-client';
import { formatBytes } from '@/lib/format-bytes';

import { NETWORK_MESSAGE, toFileErrorMessage } from '../utils/to-file-error';
import { uploadToBlob } from '../utils/upload-to-blob';
import { invalidateFolderStats } from './use-file-mutations';

const MAX_CONCURRENT_UPLOADS = 3;

// Long enough to read the result, short enough that the panel does not become furniture
const AUTO_DISMISS_MS = 5000;

const PDF_EXTENSION = '.pdf';
const INVALID_NAME_MESSAGE = 'This file name is not allowed.';
const NOT_PDF_MESSAGE = 'Only PDF files can be uploaded.';
const TOO_LARGE_MESSAGE = `File is larger than ${formatBytes(String(uploadLimits.maxBytes))}.`;
const TRANSFER_FAILED_MESSAGE = 'Upload to storage failed. Try again.';

const UploadStatus = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  FINALIZING: 'finalizing',
  DONE: 'done',
  ERROR: 'error',
} as const;

type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus];

type UploadItem = {
  id: string;
  name: string;
  sizeBytes: number;
  status: UploadStatus;
  progress: number;
  mode: UploadMode | null;
  versionNumber: number | null;
  error: string | null;
};

type UploadTask = {
  id: string;
  name: string;
  folderId: string;
  file: File;
};

type PreflightResult = { name: string } | { error: string };

const isPdf = (file: File): boolean =>
  file.type === uploadLimits.contentType ||
  (file.type === '' && file.name.toLowerCase().endsWith(PDF_EXTENSION));

/** Rejects locally what the API would reject anyway, so the user sees it per file immediately. */
const preflight = (file: File): PreflightResult => {
  if (!isPdf(file)) {
    return { error: NOT_PDF_MESSAGE };
  }

  if (file.size > uploadLimits.maxBytes) {
    return { error: TOO_LARGE_MESSAGE };
  }

  const parsed = resourceNameSchema.safeParse(file.name);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? INVALID_NAME_MESSAGE };
  }

  return { name: parsed.data };
};

const createItem = (file: File, id: string): UploadItem => ({
  id,
  name: file.name,
  sizeBytes: file.size,
  status: UploadStatus.QUEUED,
  progress: 0,
  mode: null,
  versionNumber: null,
  error: null,
});

const useUploadQueue = (currentFolderId: string) => {
  const queryClient = tsr.useQueryClient();

  const [items, setItems] = useState<UploadItem[]>([]);

  const pendingRef = useRef<UploadTask[]>([]);
  const activeCountRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Only stable references are captured, so a queued continuation may safely run a stale copy
  const update = useCallback((id: string, patch: Partial<UploadItem>): void => {
    if (!isMountedRef.current) {
      return;
    }

    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const runUpload = useCallback(
    async (task: UploadTask): Promise<void> => {
      update(task.id, { status: UploadStatus.UPLOADING, progress: 0 });

      const intent = await tsr.files.createUploadIntent
        .mutate({
          body: {
            folderId: task.folderId,
            name: task.name,
            contentType: uploadLimits.contentType,
          },
        })
        .catch(() => null);

      if (intent === null) {
        update(task.id, { status: UploadStatus.ERROR, error: NETWORK_MESSAGE });

        return;
      }

      if (intent.status !== 201) {
        update(task.id, { status: UploadStatus.ERROR, error: toFileErrorMessage(intent) });

        return;
      }

      const { mode, versionId } = intent.body;

      try {
        await uploadToBlob({
          url: intent.body.upload.url,
          file: task.file,
          contentType: uploadLimits.contentType,
          onProgress: (progress) => update(task.id, { progress }),
        });
      } catch {
        update(task.id, { status: UploadStatus.ERROR, error: TRANSFER_FAILED_MESSAGE });

        return;
      }

      update(task.id, { status: UploadStatus.FINALIZING, progress: 1 });

      const completed = await tsr.files.completeUpload
        .mutate({ params: { versionId } })
        .catch(() => null);

      if (completed === null) {
        update(task.id, { status: UploadStatus.ERROR, error: NETWORK_MESSAGE });

        return;
      }

      if (completed.status !== 200) {
        update(task.id, { status: UploadStatus.ERROR, error: toFileErrorMessage(completed) });

        return;
      }

      update(task.id, {
        status: UploadStatus.DONE,
        progress: 1,
        mode,
        versionNumber: completed.body.versionNumber,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: folderQueryKey(task.folderId, 'contents') }),
        invalidateFolderStats(queryClient),
      ]);
    },
    [queryClient, update],
  );

  const pump = useCallback((): void => {
    while (activeCountRef.current < MAX_CONCURRENT_UPLOADS && pendingRef.current.length > 0) {
      const task = pendingRef.current.shift();

      if (task === undefined) {
        return;
      }

      activeCountRef.current += 1;

      void runUpload(task).finally(() => {
        activeCountRef.current -= 1;
        pump();
      });
    }
  }, [runUpload]);

  const enqueue = useCallback(
    (files: File[]): void => {
      const added: UploadItem[] = [];
      const tasks: UploadTask[] = [];

      for (const file of files) {
        const id = globalThis.crypto.randomUUID();
        const checked = preflight(file);

        if ('error' in checked) {
          added.push({ ...createItem(file, id), status: UploadStatus.ERROR, error: checked.error });

          continue;
        }

        added.push(createItem(file, id));
        tasks.push({ id, name: checked.name, folderId: currentFolderId, file });
      }

      if (added.length === 0) {
        return;
      }

      setItems((previous) => [...previous, ...added]);
      pendingRef.current.push(...tasks);

      pump();
    },
    [currentFolderId, pump],
  );

  const dismiss = useCallback((id: string): void => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const clearFinished = useCallback((): void => {
    setItems((previous) =>
      previous.filter(
        (item) => item.status !== UploadStatus.DONE && item.status !== UploadStatus.ERROR,
      ),
    );
  }, []);

  const hasItems = items.length > 0;
  const isBusy = items.some(
    (item) => item.status !== UploadStatus.DONE && item.status !== UploadStatus.ERROR,
  );
  const hasFailure = items.some((item) => item.status === UploadStatus.ERROR);

  // A failure stays on screen until it is dismissed by hand; only a clean run closes itself
  useEffect(() => {
    if (!hasItems || isBusy || hasFailure) {
      return;
    }

    const timer = globalThis.setTimeout(clearFinished, AUTO_DISMISS_MS);

    return () => globalThis.clearTimeout(timer);
  }, [clearFinished, hasFailure, hasItems, isBusy]);

  return { items, enqueue, dismiss, clearFinished };
};

export { UploadStatus, useUploadQueue, type UploadItem };
