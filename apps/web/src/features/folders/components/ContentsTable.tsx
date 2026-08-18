import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { useMemo, useState, type MouseEvent, type ReactElement } from 'react';

import {
  ResourceKind,
  type ContentsEntry,
  type ContentsFileEntry,
  type ContentsFolderEntry,
  type ShareTarget,
} from '@data-room/contracts';

import { DeleteFileDialog } from '@/features/files/components/DeleteFileDialog';
import { FileNameCell } from '@/features/files/components/FileNameCell';
import { FileRowMenu } from '@/features/files/components/FileRowMenu';
import { MoveFileDialog } from '@/features/files/components/MoveFileDialog';
import { formatBytes } from '@/lib/format-bytes';
import { cn } from '@/lib/utils';

import { type ContentsNavigation } from './contents-navigation.type';
import { DeleteFolderDialog } from './DeleteFolderDialog';
import { FolderNameCell } from './FolderNameCell';
import { FolderRowMenu } from './FolderRowMenu';

// Under table-fixed the header row decides every width, so no cell content can shift the layout.
// twMerge resolves the padding conflicts, so a column may override the shared cell padding.
const COLUMN_CLASS: Record<string, string> = {
  size: 'w-28',
  version: 'w-24 text-center',
  updatedAt: 'w-32',
  actions: 'w-14 px-2 text-right',
};

const NO_VALUE = '—';

// Its presence is the write capability: no context, no editors, no menus, no dialogs
type ContentsWriteContext = {
  currentFolderId: string;
  rootFolderId: string;
  onShare: (request: { target: ShareTarget; name: string }) => void;
};

type ContentsTableProperties = {
  entries: ContentsEntry[];
  navigation: ContentsNavigation;
  writeContext?: ContentsWriteContext;
};

const ContentsTable = ({
  entries,
  navigation,
  writeContext,
}: ContentsTableProperties): ReactElement => {
  const [deleteTarget, setDeleteTarget] = useState<ContentsFolderEntry | null>(null);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);

  const [moveFile, setMoveFile] = useState<ContentsFileEntry | null>(null);
  const [deleteFile, setDeleteFile] = useState<ContentsFileEntry | null>(null);

  const columns = useMemo<ColumnDef<ContentsEntry>[]>(() => {
    const baseColumns: ColumnDef<ContentsEntry>[] = [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const entry = row.original;

          if (entry.kind === 'folder') {
            return (
              <FolderNameCell
                folder={entry}
                renderLink={navigation.renderFolderLink}
                editing={
                  writeContext === undefined
                    ? undefined
                    : {
                        parentFolderId: writeContext.currentFolderId,
                        isEditing: editingFolderId === entry.id,
                        onEditStart: () => setEditingFolderId(entry.id),
                        onEditEnd: () => setEditingFolderId(null),
                      }
                }
              />
            );
          }

          return (
            <FileNameCell
              file={entry}
              renderLink={navigation.renderFileLink}
              editing={
                writeContext === undefined
                  ? undefined
                  : {
                      folderId: writeContext.currentFolderId,
                      isEditing: editingFileId === entry.id,
                      onEditStart: () => setEditingFileId(entry.id),
                      onEditEnd: () => setEditingFileId(null),
                    }
              }
            />
          );
        },
      },
      {
        id: 'size',
        header: 'Size',
        cell: ({ row }) =>
          row.original.kind === 'folder' ? NO_VALUE : formatBytes(row.original.sizeBytes),
      },
      {
        id: 'version',
        header: 'Version',
        cell: ({ row }) => {
          const entry = row.original;

          // Tolerates a missing value: the two projects deploy from one push but not atomically
          if (entry.kind === 'folder' || !Number.isInteger(entry.versionNumber)) {
            return NO_VALUE;
          }

          return <span className="tabular-nums">v{entry.versionNumber}</span>;
        },
      },
      {
        id: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
    ];

    if (writeContext === undefined) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const entry = row.original;

          if (entry.kind === 'folder') {
            return (
              <FolderRowMenu
                folderName={entry.name}
                onRename={() => setEditingFolderId(entry.id)}
                onShare={() =>
                  writeContext.onShare({
                    target: { kind: ResourceKind.FOLDER, id: entry.id },
                    name: entry.name,
                  })
                }
                onDelete={() => setDeleteTarget(entry)}
              />
            );
          }

          return (
            <FileRowMenu
              fileName={entry.name}
              onOpen={() => navigation.openFileInNewTab(entry.id)}
              onRename={() => setEditingFileId(entry.id)}
              onMove={() => setMoveFile(entry)}
              onShare={() =>
                writeContext.onShare({
                  target: { kind: ResourceKind.FILE, id: entry.id },
                  name: entry.name,
                })
              }
              onDelete={() => setDeleteFile(entry)}
            />
          );
        },
      },
    ];
  }, [editingFileId, editingFolderId, navigation, writeContext]);

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="scroll-slim min-h-0 flex-1 overflow-auto pr-3">
        <table className="w-full min-w-150 table-fixed border-separate border-spacing-0 text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'sticky top-0 z-10 border-b bg-card px-4 py-3 font-medium',
                      COLUMN_CLASS[header.column.id],
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => {
              const entry = row.original;

              // Any open inline editor owns the next click: it commits the rename, not navigation
              const isEditingRow = editingFolderId !== null || editingFileId !== null;

              // Only folders navigate from the row. A file opens from its name or its menu,
              // because a stray click on a row should never spawn a browser tab.
              const isClickableRow = !isEditingRow && entry.kind === 'folder';

              const handleRowClick = isClickableRow
                ? (event: MouseEvent<HTMLTableRowElement>) => {
                    // The name is a real link and the menu a button: each owns its own click
                    if (event.target instanceof Element && event.target.closest('a, button')) {
                      return;
                    }

                    // A modified click belongs to the browser, not to us
                    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                      return;
                    }

                    navigation.openFolder(entry.id);
                  }
                : undefined;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    'group/row last:[&>td]:border-0 hover:bg-muted/30',
                    handleRowClick !== undefined && 'cursor-pointer',
                  )}
                  onClick={handleRowClick}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn('border-b px-4 py-3', COLUMN_CLASS[cell.column.id])}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {writeContext === undefined ? null : (
        <>
          {deleteTarget === null ? null : (
            <DeleteFolderDialog
              folder={deleteTarget}
              parentFolderId={writeContext.currentFolderId}
              onClose={() => setDeleteTarget(null)}
            />
          )}

          {moveFile === null ? null : (
            <MoveFileDialog
              file={moveFile}
              currentFolderId={writeContext.currentFolderId}
              rootFolderId={writeContext.rootFolderId}
              onClose={() => setMoveFile(null)}
            />
          )}

          {deleteFile === null ? null : (
            <DeleteFileDialog
              file={deleteFile}
              currentFolderId={writeContext.currentFolderId}
              onClose={() => setDeleteFile(null)}
            />
          )}
        </>
      )}
    </>
  );
};

export { ContentsTable };
