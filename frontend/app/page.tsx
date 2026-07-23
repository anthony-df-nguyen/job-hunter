"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import ConfirmDialog from "@/components/ConfirmDialog";
import JobsTable from "@/components/JobsTable";
import RunProgressBanner from "@/components/RunProgressBanner";
import { deleteAllJobs, deleteJob, fetcher, startRun, updateJob } from "@/lib/api";
import type { Job, JobStatus, Run } from "@/lib/types";

export default function JobsPage() {
  const { data: jobs, mutate: mutateJobs } = useSWR<Job[]>("/jobs", fetcher);
  const { data: statuses } = useSWR<JobStatus[]>("/statuses", fetcher);
  const { data: latestRuns } = useSWR<Run[]>("/runs?limit=1", fetcher);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [runInProgress, setRunInProgress] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);

  // Rehydrate on mount/remount (e.g. after navigating away and back) in case
  // a run is still going on the backend — local state doesn't survive a
  // route change since this component unmounts. Adjusted during render
  // (guarded by the reference check) rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [rehydratedFrom, setRehydratedFrom] = useState<Run[] | undefined>(undefined);
  if (latestRuns !== rehydratedFrom) {
    setRehydratedFrom(latestRuns);
    if (activeRunId === null && latestRuns?.[0]?.status === "running") {
      setActiveRunId(latestRuns[0].id);
      setRunInProgress(true);
    }
  }

  async function handleRun() {
    setError(null);
    setStarting(true);
    try {
      const run = await startRun();
      setActiveRunId(run.id);
      setRunInProgress(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start run");
    } finally {
      setStarting(false);
    }
  }

  const handleSettled = useCallback(() => {
    setRunInProgress(false);
    mutateJobs();
  }, [mutateJobs]);

  async function handleUpdate(id: number, patch: { status_id?: number; notes?: string }) {
    await updateJob(id, patch);
    mutateJobs();
  }

  async function handleDelete(id: number) {
    await deleteJob(id);
    mutateJobs();
  }

  async function handleDeleteAll() {
    setConfirmDeleteAllOpen(false);
    await deleteAllJobs();
    mutateJobs();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Jobs</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmDeleteAllOpen(true)}
            disabled={!jobs || jobs.length === 0}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete All
          </button>
          <button
            onClick={handleRun}
            disabled={starting || runInProgress}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {starting ? "Starting…" : "Run Search"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteAllOpen}
        title="Delete all jobs?"
        message={`This will permanently delete all ${jobs?.length ?? 0} tracked job${jobs?.length === 1 ? "" : "s"}, including their statuses and notes. This action cannot be undone.`}
        confirmLabel="Confirm Delete"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmDeleteAllOpen(false)}
      />

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {activeRunId !== null && (
        <RunProgressBanner runId={activeRunId} onSettled={handleSettled} />
      )}

      <JobsTable
        jobs={jobs ?? []}
        statuses={statuses ?? []}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
