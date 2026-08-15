/**
 * PENDING --> READY | FAILED | DELETING
 * READY | FAILED --> DELETING --> DELETED
 *
 * READY is reachable only after a storage HEAD check; every removal passes through DELETING,
 * which tracks outstanding blob cleanup.
 */
const FileVersionStatus = {
  PENDING: 'PENDING',
  READY: 'READY',
  FAILED: 'FAILED',
  DELETING: 'DELETING',
  DELETED: 'DELETED',
} as const;

type FileVersionStatus = (typeof FileVersionStatus)[keyof typeof FileVersionStatus];

export { FileVersionStatus };
