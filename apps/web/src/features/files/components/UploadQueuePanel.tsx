import { UploadMode } from '@data-room/contracts';
import { ChevronDown, ChevronUp, CircleAlert, CircleCheck, X } from 'lucide-react';
import { useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/format-bytes';

import { UploadStatus, type UploadItem } from '../hooks';

const PERCENT = 100;

type UploadQueuePanelProperties = {
  items: UploadItem[];
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
};

const isFinished = (item: UploadItem): boolean =>
  item.status === UploadStatus.DONE || item.status === UploadStatus.ERROR;

const describe = (item: UploadItem): string => {
  if (item.status === UploadStatus.QUEUED) {
    return 'Waiting…';
  }

  if (item.status === UploadStatus.UPLOADING) {
    return `${Math.round(item.progress * PERCENT)}%`;
  }

  if (item.status === UploadStatus.FINALIZING) {
    return 'Finishing…';
  }

  if (item.status === UploadStatus.DONE) {
    return item.mode === UploadMode.NEW_VERSION
      ? `Updated — version ${item.versionNumber ?? ''}`.trim()
      : 'Added';
  }

  return item.error ?? 'Upload failed.';
};

const UploadQueuePanel = ({
  items,
  onDismiss,
  onClearFinished,
}: UploadQueuePanelProperties): ReactElement | null => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const active = items.filter((item) => !isFinished(item));
  const activeCount = active.length;
  const finishedCount = items.length - activeCount;

  const overallProgress =
    activeCount === 0 ? 1 : active.reduce((total, item) => total + item.progress, 0) / activeCount;

  return (
    <aside
      aria-label="Uploads"
      className="fixed right-4 bottom-4 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border bg-card shadow-lg"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <h2 className="min-w-0 truncate text-sm font-medium" aria-live="polite">
          {activeCount > 0
            ? `Uploading ${activeCount} file${activeCount === 1 ? '' : 's'}… ${Math.round(
                overallProgress * PERCENT,
              )}%`
            : `${finishedCount} upload${finishedCount === 1 ? '' : 's'} finished`}
        </h2>

        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand uploads' : 'Collapse uploads'}
            onClick={() => setIsCollapsed((previous) => !previous)}
          >
            {isCollapsed ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>

          {finishedCount === 0 ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear finished uploads"
              onClick={onClearFinished}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      {isCollapsed ? null : (
        <ul className="max-h-72 overflow-y-auto py-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium" title={item.name}>
                    {item.name}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatBytes(String(item.sizeBytes))}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  {item.status === UploadStatus.DONE ? (
                    <CircleCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  ) : null}

                  {item.status === UploadStatus.ERROR ? (
                    <CircleAlert
                      className="size-3.5 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                  ) : null}

                  <p
                    className={
                      item.status === UploadStatus.ERROR
                        ? 'text-xs text-destructive'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    {describe(item)}
                  </p>
                </div>

                {isFinished(item) ? null : (
                  <div
                    role="progressbar"
                    aria-label={`Upload progress for ${item.name}`}
                    aria-valuemin={0}
                    aria-valuemax={PERCENT}
                    aria-valuenow={Math.round(item.progress * PERCENT)}
                    className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 motion-reduce:transition-none"
                      style={{ width: `${Math.round(item.progress * PERCENT)}%` }}
                    />
                  </div>
                )}
              </div>

              {isFinished(item) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0"
                  aria-label={`Dismiss ${item.name}`}
                  onClick={() => onDismiss(item.id)}
                >
                  <X aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};

export { UploadQueuePanel };
