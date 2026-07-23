"use client";

import { useState } from "react";

interface TagItem {
  id: number;
  text: string;
}

export default function TagList({
  label,
  hint,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  hint?: string;
  items: TagItem[];
  onAdd: (text: string) => void;
  onRemove: (id: number) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </h3>
        {hint && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
        )}
      </div>
      {/* Text Entry */}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a keyword and press Enter"
          className="w-full max-w-sm rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </div>
      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {item.text}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="ml-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label={`Remove ${item.text}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
