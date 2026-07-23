"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import type { Job, JobStatus } from "@/lib/types";
import ColumnsMenu from "./ColumnsMenu";
import TableHeaderCell from "./TableHeaderCell";
import { useJobColumns } from "./columns";
import { getPinnedCellStyle, pinnedCellClassName } from "./pinning";
import { usePersistedTableState } from "./usePersistedTableState";

export default function JobsTable({
  jobs,
  statuses,
  onUpdate,
  onDelete,
}: {
  jobs: Job[];
  statuses: JobStatus[];
  onUpdate: (id: number, patch: { status_id?: number; notes?: string }) => void;
  onDelete: (id: number) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date_seen", desc: true }]);
  const columns = useJobColumns({ statuses, onUpdate, onDelete });
  const defaultColumnOrder = useMemo(() => columns.map((c) => c.id as string), [columns]);

  const {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    columnPinning,
    setColumnPinning,
    columnSizing,
    setColumnSizing,
    reset,
  } = usePersistedTableState(defaultColumnOrder);

  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting, columnVisibility, columnOrder, columnPinning, columnSizing },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    enableColumnPinning: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Pinned columns must be rendered left-to-right, center, then right-pinned —
  // TanStack tracks pin groups separately from `columnOrder`, so header/body
  // cells are assembled from the three groups rather than a single flat list.
  const orderedColumns = [
    ...table.getLeftVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getRightVisibleLeafColumns(),
  ];
  const orderedHeaders = [...table.getLeftFlatHeaders(), ...table.getCenterFlatHeaders(), ...table.getRightFlatHeaders()];

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColumnsMenu table={table} columnOrder={columnOrder} onColumnOrderChange={setColumnOrder} onReset={reset} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table style={{ width: table.getTotalSize(), tableLayout: "fixed" }} className="text-left text-sm">
          <colgroup>
            {orderedColumns.map((column) => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {orderedHeaders.map((header) => (
                <TableHeaderCell key={header.id} header={header} />
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const cells = [...row.getLeftVisibleCells(), ...row.getCenterVisibleCells(), ...row.getRightVisibleCells()];
              return (
                <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  {cells.map((cell) => (
                    <td
                      key={cell.id}
                      style={getPinnedCellStyle(cell.column)}
                      className={`overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 ${pinnedCellClassName(cell.column)}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={orderedColumns.length} className="px-3 py-6 text-center text-zinc-500">
                  <div>No jobs yet — run a search to get started.</div>
                  <Link href="/settings" className="mt-2 inline-block text-blue-600 hover:underline dark:text-blue-400">
                    Refine your search criteria in Settings
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
