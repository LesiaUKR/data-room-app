import { logger } from '../modules/logger/index.js';
import { type StorageProvider } from '../modules/storage/index.js';
import { type RetiredVersion } from '../types/index.js';

// Five chunks of deleteMany: a huge subtree must not spend the whole function timeout on blob calls
const SWEEP_MAX_OBJECTS = 500;

type SweepRequest = {
  retired: RetiredVersion[];
  storage: StorageProvider;
  markDeleted: (versionIds: string[]) => Promise<void>;
};

/** Awaited after the commit and before the response: nothing survives a serverless response. */
const sweepRetiredVersions = async ({
  retired,
  storage,
  markDeleted,
}: SweepRequest): Promise<void> => {
  if (retired.length === 0) {
    return;
  }

  // Only the blob work is capped; the rest is already DELETING and stays a sweep target
  const batch = retired.slice(0, SWEEP_MAX_OBJECTS);

  try {
    await storage.deleteMany(batch.map((version) => version.objectKey));
    await markDeleted(batch.map((version) => version.id));
  } catch (error) {
    logger.error({ err: error, versionCount: batch.length }, 'Blob cleanup failed after delete');

    return;
  }

  if (retired.length > batch.length) {
    logger.warn(
      { retiredCount: retired.length, sweptCount: batch.length },
      'Cleanup capped for this request; the remaining versions stay DELETING',
    );
  }
};

export { sweepRetiredVersions };
