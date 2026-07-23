"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import type { Job, JobStatus } from "@/lib/types";
import { formatSalary } from "./formatSalary";

const columnHelper = createColumnHelper<Job>();

export function useJobColumns({
  statuses,
  onUpdate,
  onDelete,
}: {
  statuses: JobStatus[];
  onUpdate: (id: number, patch: { status_id?: number; notes?: string }) => void;
  onDelete: (id: number) => void;
}) {
  return useMemo(
    () => [
      columnHelper.accessor("date_seen", { id: "date_seen", header: "Date Seen", size: 110 }),
      columnHelper.accessor("title", {
        id: "title",
        header: "Title",
        size: 280,
        minSize: 120,
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
      columnHelper.accessor("company", { id: "company", header: "Company", size: 160 }),
      columnHelper.accessor("location", { id: "location", header: "Location", size: 160 }),
      columnHelper.accessor("is_remote", {
        id: "is_remote",
        header: "Remote",
        size: 90,
        cell: (info) => (info.getValue() ? "Yes" : "No"),
      }),
      columnHelper.display({
        id: "salary",
        header: "Salary",
        size: 120,
        cell: (info) => formatSalary(info.row.original),
      }),
      columnHelper.accessor("site", { id: "site", header: "Site", size: 100 }),
      columnHelper.display({
        id: "status",
        header: "Status",
        size: 160,
        cell: (info) => {
          const job = info.row.original;
          return (
            <select
              value={job.status_id}
              onChange={(e) => onUpdate(job.id, { status_id: Number(e.target.value) })}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
        size: 240,
        minSize: 120,
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
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          );
        },
      }),
      columnHelper.display({
        id: "delete",
        header: "",
        size: 50,
        minSize: 50,
        maxSize: 50,
        enableResizing: false,
        cell: (info) => {
          const job = info.row.original;
          return (
            <button
              onClick={() => {
                if (confirm(`Delete "${job.title}" at ${job.company}?`)) {
                  onDelete(job.id);
                }
              }}
              className="text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
              aria-label={`Delete ${job.title}`}
              title="Delete"
            >
              ✕
            </button>
          );
        },
      }),
    ],
    [statuses, onUpdate, onDelete],
  );
}
