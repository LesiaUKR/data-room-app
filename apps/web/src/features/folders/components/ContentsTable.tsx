import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { FileText } from 'lucide-react';
import { useMemo, useState, type ReactElement } from 'react';

import { type ContentsEntry, type ContentsFolderEntry } from '@data-room/contracts';

import { formatBytes } from '@/lib/format-bytes';
import { cn } from '@/lib/utils';

import { DeleteFolderDialog } from './DeleteFolderDialog';
import { FolderNameCell } from './FolderNameCell';
import { FolderRowMenu } from './FolderRowMenu';

type ContentsTableProperties = {
  entries: ContentsEntry[];
  currentFolderId: string;
  onOpenFolder: (folderId: string) => void;
};

const ContentsTable = ({
  entries,
  currentFolderId,
  onOpenFolder,
}: ContentsTableProperties): ReactElement => {
  const [deleteTarget, setDeleteTarget] = useState<ContentsFolderEntry | null>(null);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<ContentsEntry>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const entry = row.original;

          if (entry.kind === 'folder') {
            return (
              <FolderNameCell
                folder={entry}
                parentFolderId={currentFolderId}
                isEditing={editingFolderId === entry.id}
                onEditStart={() => setEditingFolderId(entry.id)}
                onEditEnd={() => setEditingFolderId(null)}
              />
            );
          }

          return (
            <div className="flex min-w-0 items-center gap-3 font-medium">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
                <FileText className="size-4" aria-hidden="true" />
              </span>
              <span className="truncate">{entry.name}</span>
            </div>
          );
        },
      },
      {
        id: 'size',
        header: 'Size',
        cell: ({ row }) =>
          row.original.kind === 'folder' ? '—' : formatBytes(row.original.sizeBytes),
      },
      {
        id: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const entry = row.original;

          if (entry.kind !== 'folder') {
            return null;
          }

          return (
            <FolderRowMenu
              folderName={entry.name}
              onRename={() => setEditingFolderId(entry.id)}
              onDelete={() => setDeleteTarget(entry)}
            />
          );
        },
      },
    ],
    [currentFolderId, editingFolderId, onOpenFolder],
  );

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-130 text-left text-sm">
          <thead className="border-b bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 font-medium',
                      header.column.id === 'actions' && 'w-14 px-2',
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
              const openableFolderId =
                entry.kind === 'folder' && editingFolderId === null ? entry.id : null;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    'group/row border-b last:border-0 hover:bg-muted/30',
                    openableFolderId !== null && 'cursor-pointer',
                  )}
                  onClick={
                    openableFolderId === null ? undefined : () => onOpenFolder(openableFolderId)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn('px-4 py-3', cell.column.id === 'actions' && 'px-2 text-right')}
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

      {deleteTarget === null ? null : (
        <DeleteFolderDialog
          folder={deleteTarget}
          parentFolderId={currentFolderId}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export { ContentsTable };
