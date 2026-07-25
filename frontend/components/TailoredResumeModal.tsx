"use client";

import { useState } from "react";

export default function TailoredResumeModal({
  open,
  loading,
  error,
  resume,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  resume: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleCopy() {
    if (!resume) return;
    await navigator.clipboard.writeText(resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tailored-resume-title"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            id="tailored-resume-title"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Tailored Resume
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {loading && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Generating tailored resume…
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {!loading && !error && resume && (
            <pre className="whitespace-pre-wrap wrap-break-word rounded-md bg-zinc-50 p-3 text-sm text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              {resume}
            </pre>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Close
          </button>
          {resume && !loading && !error && (
            <button
              onClick={handleCopy}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {copied ? "Copied ✓" : "Copy to clipboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
