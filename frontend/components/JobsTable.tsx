"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import type { Job, JobStatus } from "@/lib/types";

function formatSalary(job: Job) {
  if (job.salary_min && job.salary_max) {
    return `$${Math.round(job.salary_min / 1000)}K–$${Math.round(job.salary_max / 1000)}K`;
  }
  if (job.salary_max) return `up to $${Math.round(job.salary_max / 1000)}K`;
  return "—";
}

const columnHelper = createColumnHelper<Job>();

export default function JobsTable({
  jobs,
  statuses,
  onUpdate,
}: {
  jobs: Job[];
  statuses: JobStatus[];
  onUpdate: (id: number, patch: { status_id?: number; notes?: string }) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "date_seen", desc: true }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("date_seen", { header: "Date Seen" }),
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => (
          <a
            href={info.row.original.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {info.getValue()}
          </a>
        ),
      }),
      columnHelper.accessor("company", { header: "Company" }),
      columnHelper.accessor("location", { header: "Location" }),
      columnHelper.accessor("is_remote", {
        header: "Remote",
        cell: (info) => (info.getValue() ? "Yes" : "No"),
      }),
      columnHelper.display({
        id: "salary",
        header: "Salary",
        cell: (info) => formatSalary(info.row.original),
      }),
      columnHelper.accessor("site", { header: "Site" }),
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: (info) => {
          const job = info.row.original;
          return (
            <select
              value={job.status_id}
              onChange={(e) => onUpdate(job.id, { status_id: Number(e.target.value) })}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.display({
        id: "notes",
        header: "Notes",
        cell: (info) => {
          const job = info.row.original;
          return (
            <input
              defaultValue={job.notes}
              onBlur={(e) => {
                if (e.target.value !== job.notes) {
                  onUpdate(job.id, { notes: e.target.value });
                }
              }}
              className="w-full min-w-[10rem] rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          );
        },
      }),
    ],
    [statuses, onUpdate],
  );

  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-medium text-zinc-600 dark:text-zinc-300"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-zinc-500">
                No jobs yet — run a search to get started.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
