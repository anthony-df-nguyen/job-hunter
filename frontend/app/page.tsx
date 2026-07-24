"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import ConfirmDialog from "@/components/ConfirmDialog";
import JobsTable from "@/components/JobsTable";
import RunProgressBanner from "@/components/RunProgressBanner";
import UndoToastStack, { type PendingDeleteToast } from "@/components/UndoToastStack";
import { deleteAllJobs, deleteJob, fetcher, startRun, updateJob } from "@/lib/api";
import { UNDO_WINDOW_MS } from "@/lib/constants";
import type { Job, JobStatus, Run } from "@/lib/types";

interface PendingDelete {
  job: Job;
  timer: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
  paused: boolean;
}

export default function JobsPage() {
  const { data: jobs, mutate: mutateJobs } = useSWR<Job[]>("/jobs", fetcher);
  const { data: statuses } = useSWR<JobStatus[]>("/statuses", fetcher);
  const { data: latestRuns } = useSWR<Run[]>("/runs?limit=1", fetcher);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [runInProgress, setRunInProgress] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Map<number, PendingDelete>>(new Map());
  const pendingDeletesRef = useRef(pendingDeletes);
  pendingDeletesRef.current = pendingDeletes;

  // Any pending (not-yet-committed) deletes still holding a live timer should
  // be flushed immediately if the page unmounts, so they aren't silently lost.
  useEffect(() => {
    return () => {
      for (const pending of pendingDeletesRef.current.values()) {
        if (pending.timer) clearTimeout(pending.timer);
        deleteJob(pending.job.id).catch(() => {});
      }
    };
  }, []);

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

  const commitDelete = useCallback(
    async (id: number) => {
      setPendingDeletes((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      try {
        await deleteJob(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete job");
        mutateJobs();
      }
    },
    [mutateJobs],
  );

  function handleDelete(id: number) {
    const job = jobs?.find((j) => j.id === id);
    if (!job) return;

    // Optimistically drop the row now; the actual DELETE is deferred so
    // "Undo" can cancel it before it ever hits the backend.
    mutateJobs((current) => current?.filter((j) => j.id !== id), false);

    const timer = setTimeout(() => commitDelete(id), UNDO_WINDOW_MS);
    setPendingDeletes((prev) => {
      const next = new Map(prev);
      next.set(id, { job, timer, remainingMs: UNDO_WINDOW_MS, startedAt: Date.now(), paused: false });
      return next;
    });
  }

  function handleUndoDelete(id: number) {
    const pending = pendingDeletesRef.current.get(id);
    if (!pending) return;
    if (pending.timer) clearTimeout(pending.timer);
    setPendingDeletes((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    mutateJobs((current) => (current ? [...current, pending.job] : [pending.job]), false);
  }

  function handlePauseDelete(id: number) {
    const pending = pendingDeletesRef.current.get(id);
    if (!pending || !pending.timer) return;
    clearTimeout(pending.timer);
    const elapsed = Date.now() - pending.startedAt;
    setPendingDeletes((prev) => {
      const next = new Map(prev);
      next.set(id, { ...pending, timer: null, remainingMs: Math.max(0, pending.remainingMs - elapsed), paused: true });
      return next;
    });
  }

  function handleResumeDelete(id: number) {
    const pending = pendingDeletesRef.current.get(id);
    if (!pending || pending.timer) return;
    const timer = setTimeout(() => commitDelete(id), pending.remainingMs);
    setPendingDeletes((prev) => {
      const next = new Map(prev);
      next.set(id, { ...pending, timer, startedAt: Date.now(), paused: false });
      return next;
    });
  }

  const deleteToasts: PendingDeleteToast[] = Array.from(pendingDeletes.entries()).map(([id, p]) => ({
    id,
    job: p.job,
    paused: p.paused,
  }));

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

      <UndoToastStack
        toasts={deleteToasts}
        onUndo={handleUndoDelete}
        onPause={handlePauseDelete}
        onResume={handleResumeDelete}
      />
    </div>
  );
}
