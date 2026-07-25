"use client";

import { useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { Job, JobStatus } from "@/lib/types";
import { formatSalary } from "./formatSalary";

function readableTextColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

export function useJobColumns({
  statuses,
  onUpdate,
  onDelete,
  onTailor,
  expandedIds,
  onToggleExpand,
}: {
  statuses: JobStatus[];
  onUpdate: (id: number, patch: { status_id?: number; notes?: string }) => void;
  onDelete: (id: number) => void;
  onTailor: (id: number) => void;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
}) {
  return useMemo<ColDef<Job>[]>(() => {
    const statusNameById = new Map(statuses.map((s) => [s.id, s.name]));
    const statusById = new Map(statuses.map((s) => [s.id, s]));
    return [
      {
        colId: "expand",
        headerName: "",
        width: 50,
        minWidth: 50,
        maxWidth: 50,
        sortable: false,
        resizable: false,
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<Job>) => {
          const job = params.data;
          if (!job || !job.description) return null;
          const expanded = expandedIds.has(job.id);
          return (
            <button
              onClick={() => onToggleExpand(job.id)}
              className="flex h-full w-full items-center justify-center text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              aria-label={expanded ? "Collapse description" : "Expand description"}
              aria-expanded={expanded}
              title={expanded ? "Hide description" : "Show description"}
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-12 w-12 transition-transform ${expanded ? "rotate-90" : ""}`}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.08-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          );
        },
      },
      { field: "date_seen", colId: "date_seen", headerName: "Date Seen", initialWidth: 110, sort: "desc" },
      {
        field: "title",
        colId: "title",
        headerName: "Title",
        initialWidth: 280,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<Job>) =>
          params.data ? (
            <a
              href={params.data.url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 font-semibold hover:underline dark:text-blue-400"
            >
              {params.data.title}
            </a>
          ) : null,
      },
      { field: "company", colId: "company", headerName: "Company", initialWidth: 160 },
      { field: "location", colId: "location", headerName: "Location", initialWidth: 160 },
      {
        field: "is_remote",
        colId: "is_remote",
        headerName: "Remote",
        initialWidth: 90,
        valueFormatter: (params) => (params.value ? "Yes" : "No"),
      },
      {
        colId: "salary",
        headerName: "Salary",
        initialWidth: 120,
        sortable: false,
        valueGetter: (params) => (params.data ? formatSalary(params.data) : ""),
      },
      { field: "site", colId: "site", headerName: "Site", initialWidth: 100 },
      {
        field: "status_id",
        colId: "status",
        headerName: "Status",
        initialWidth: 160,
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: statuses.map((s) => s.id) },
        valueFormatter: (params) => statusNameById.get(params.value) ?? "",
        cellRenderer: (params: ICellRendererParams<Job>) => {
          const status = statusById.get(params.value);
          const color = status?.color ?? "#71717a";
          return (
            <span className="flex h-full w-full items-center justify-between gap-1">
              <span
                className="truncate rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: color, color: readableTextColor(color) }}
              >
                {statusNameById.get(params.value) ?? ""}
              </span>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          );
        },
        onCellValueChanged: (event) => {
          if (event.data) onUpdate(event.data.id, { status_id: Number(event.newValue) });
        },
      },
      {
        field: "notes",
        colId: "notes",
        headerName: "Notes",
        initialWidth: 240,
        minWidth: 120,
        editable: true,
        onCellValueChanged: (event) => {
          if (event.data) onUpdate(event.data.id, { notes: event.newValue ?? "" });
        },
      },
      {
        colId: "tailor",
        headerName: "",
        width: 50,
        minWidth: 50,
        maxWidth: 50,
        sortable: false,
        resizable: false,
        pinned: "right",
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<Job>) => {
          const job = params.data;
          if (!job) return null;
          const disabled = !job.description;
          return (
            <button
              onClick={() => onTailor(job.id)}
              disabled={disabled}
              className="text-zinc-400 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-500 dark:hover:text-blue-400"
              aria-label={`Tailor resume for ${job.title}`}
              title={disabled ? "No description to tailor against" : "Tailor resume"}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          );
        },
      },
      {
        colId: "delete",
        headerName: "",
        width: 50,
        minWidth: 50,
        maxWidth: 50,
        sortable: false,
        resizable: false,
        pinned: "right",
        suppressMovable: true,
        cellRenderer: (params: ICellRendererParams<Job>) => {
          const job = params.data;
          if (!job) return null;
          return (
            <button
              onClick={() => onDelete(job.id)}
              className="text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
              aria-label={`Delete ${job.title}`}
              title="Delete"
            >
              ✕
            </button>
          );
        },
      },
    ];
  }, [statuses, onUpdate, onDelete, onTailor, expandedIds, onToggleExpand]);
}
