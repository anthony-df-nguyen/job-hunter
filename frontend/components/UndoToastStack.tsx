"use client";

import { UNDO_WINDOW_MS } from "@/lib/constants";
import type { Job } from "@/lib/types";

export interface PendingDeleteToast {
  id: number;
  job: Job;
  paused: boolean;
}

export default function UndoToastStack({
  toasts,
  onUndo,
  onPause,
  onResume,
}: {
  toasts: PendingDeleteToast[];
  onUndo: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onMouseEnter={() => onPause(t.id)}
          onMouseLeave={() => onResume(t.id)}
          role="status"
          className="relative overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="text-zinc-700 dark:text-zinc-200">
              Deleted <span className="font-medium">{t.job.title}</span> at {t.job.company}
            </span>
            <button
              onClick={() => onUndo(t.id)}
              className="shrink-0 font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Undo
            </button>
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-1 origin-left bg-blue-500 dark:bg-blue-400"
            style={{
              animation: `toast-countdown ${UNDO_WINDOW_MS}ms linear forwards`,
              animationPlayState: t.paused ? "paused" : "running",
            }}
          />
        </div>
      ))}
    </div>
  );
}
