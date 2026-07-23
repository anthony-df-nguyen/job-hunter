"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import JobsTable from "@/components/JobsTable";
import RunProgressBanner from "@/components/RunProgressBanner";
import { fetcher, startRun, updateJob } from "@/lib/api";
import type { Job, JobStatus } from "@/lib/types";

export default function JobsPage() {
  const { data: jobs, mutate: mutateJobs } = useSWR<Job[]>("/jobs", fetcher);
  const { data: statuses } = useSWR<JobStatus[]>("/statuses", fetcher);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    setStarting(true);
    try {
      const run = await startRun();
      setActiveRunId(run.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start run");
    } finally {
      setStarting(false);
    }
  }

  const handleSettled = useCallback(() => {
    mutateJobs();
  }, [mutateJobs]);

  async function handleUpdate(id: number, patch: { status_id?: number; notes?: string }) {
    await updateJob(id, patch);
    mutateJobs();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Jobs</h1>
        <button
          onClick={handleRun}
          disabled={starting || activeRunId !== null}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {starting ? "Starting…" : "Run Search"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {activeRunId !== null && (
        <RunProgressBanner runId={activeRunId} onSettled={handleSettled} />
      )}

      <JobsTable jobs={jobs ?? []} statuses={statuses ?? []} onUpdate={handleUpdate} />
    </div>
  );
}
