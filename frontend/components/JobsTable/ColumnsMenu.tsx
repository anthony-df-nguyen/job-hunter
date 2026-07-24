"use client";

import { useState } from "react";
import type { GridApi } from "ag-grid-community";
import { COLUMN_LABELS, STORAGE_KEY } from "./constants";

export default function ColumnsMenu({ api }: { api: GridApi | null }) {
  const [open, setOpen] = useState(false);
  // Grid API mutations don't re-render this component; bump to refresh checkboxes.
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const columns = api?.getAllGridColumns() ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!api}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Columns
      </button>
      {open && api && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <ul className="space-y-1">
              {columns.map((column) => {
                const id = column.getColId();
                const label = COLUMN_LABELS[id] ?? id;
                const pinned = column.getPinned();
                return (
                  <li key={id} className="flex items-center gap-2 rounded px-1 py-1">
                    <input
                      type="checkbox"
                      checked={column.isVisible()}
                      onChange={(e) => {
                        api.setColumnsVisible([id], e.target.checked);
                        refresh();
                      }}
                      className="shrink-0"
                    />
                    <span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        api.setColumnsPinned([id], pinned === "left" ? null : "left");
                        refresh();
                      }}
                      aria-label={`${pinned === "left" ? "Unpin" : "Pin"} ${label} left`}
                      title="Pin left"
                      className={`shrink-0 rounded px-1 text-xs ${
                        pinned === "left"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                      }`}
                    >
                      ⇤
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        api.setColumnsPinned([id], pinned === "right" ? null : "right");
                        refresh();
                      }}
                      aria-label={`${pinned === "right" ? "Unpin" : "Pin"} ${label} right`}
                      title="Pin right"
                      className={`shrink-0 rounded px-1 text-xs ${
                        pinned === "right"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                      }`}
                    >
                      ⇥
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch {
                  // ignore unavailable localStorage
                }
                api.resetColumnState();
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
