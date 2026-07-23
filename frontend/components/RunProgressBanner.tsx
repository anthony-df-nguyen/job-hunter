"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { cancelRun, fetcher } from "@/lib/api";
import type { Run } from "@/lib/types";

export default function RunProgressBanner({
  runId,
  onSettled,
}: {
  runId: number;
  onSettled: () => void;
}) {
  const { data: run, mutate } = useSWR<Run>(`/runs/${runId}`, fetcher, {
    refreshInterval: (latest) => (latest?.status === "running" ? 1500 : 0),
  });
  const [cancelling, setCancelling] = useState(false);

  const settledRef = useRef(false);
  useEffect(() => {
    if (run && run.status !== "running" && !settledRef.current) {
      settledRef.current = true;
      onSettled();
    }
  }, [run, onSettled]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const updated = await cancelRun(runId);
      mutate(updated);
    } catch {
      // Run may have already finished between the last poll and this click.
      mutate();
    } finally {
      setCancelling(false);
    }
  }

  if (!run) return null;

  if (run.status === "error") {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Run failed: {run.error_message ?? "unknown error"}
      </div>
    );
  }

  if (run.status === "cancelled") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Cancelled — {run.new_jobs_count} new job{run.new_jobs_count === 1 ? "" : "s"}, {" "}
        {run.filtered_count} filtered out, {run.skipped_seen_count} already seen.
      </div>
    );
  }

  if (run.status === "done") {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
        Done — {run.new_jobs_count} new job{run.new_jobs_count === 1 ? "" : "s"}, {" "}
        {run.filtered_count} filtered out, {run.skipped_seen_count} already seen.
      </div>
    );
  }

  const pct = run.progress_total > 0 ? (run.progress_completed / run.progress_total) * 100 : 0;
  const label = run.current_search_title
    ? `${run.current_search_title} · ${run.current_search_location}${run.current_search_is_remote ? " (remote)" : ""}`
    : "Starting…";

  return (
    <div className="rounded-md border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <span>
          {run.cancel_requested
            ? "Cancelling — finishing current search…"
            : `Searching ${Math.min(run.progress_completed + 1, run.progress_total)} of ${run.progress_total}: ${label}`}
        </span>
        <button
          onClick={handleCancel}
          disabled={cancelling || run.cancel_requested}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {run.cancel_requested ? "Cancelling…" : "Cancel"}
        </button>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-zinc-700 transition-all dark:bg-zinc-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
