"use client";

import { useState } from "react";
import useSWR from "swr";
import { createStatus, deleteStatus, fetcher, updateStatus } from "@/lib/api";
import type { JobStatus } from "@/lib/types";

export default function JobStatusesEditor() {
  const { data: statuses, mutate } = useSWR<JobStatus[]>("/statuses", fetcher);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!draft.trim()) return;
    setError(null);
    try {
      await createStatus(draft.trim(), statuses?.length ?? 0);
      setDraft("");
      mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add status");
    }
  }

  async function handleRemove(id: number) {
    setError(null);
    try {
      await deleteStatus(id);
      mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove status");
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Job Statuses</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        The pipeline stages shown in the Jobs table&apos;s status dropdown. The default
        is assigned to newly-scraped jobs.
      </p>
      <ul className="space-y-1">
        {(statuses ?? []).map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
          >
            <span className="flex items-center gap-2">
              <input
                type="text"
                defaultValue={s.name}
                onBlur={async (e) => {
                  if (e.target.value.trim() && e.target.value !== s.name) {
                    await updateStatus(s.id, { name: e.target.value.trim() });
                    mutate();
                  }
                }}
                className="rounded-md border border-transparent bg-transparent px-1 py-0.5 hover:border-zinc-300 focus:border-zinc-300 dark:hover:border-zinc-700 dark:focus:border-zinc-700"
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input
                  type="radio"
                  name="default-status"
                  checked={s.is_default}
                  onChange={async () => {
                    await updateStatus(s.id, { is_default: true });
                    mutate();
                  }}
                />
                Default for new jobs
              </label>
            </span>
            <button
              type="button"
              onClick={() => handleRemove(s.id)}
              className="text-zinc-400 hover:text-red-600"
              aria-label={`Remove ${s.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a status…"
          className="w-full max-w-xs rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
