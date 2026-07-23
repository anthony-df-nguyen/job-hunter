"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  createJobTitle,
  createLocation,
  createSearchConfig,
  deleteJobTitle,
  deleteLocation,
  deleteSearchConfig,
  fetcher,
  updateSearchConfig,
} from "@/lib/api";
import type { JobTitle, Location, SearchConfig } from "@/lib/types";

function EntityList({
  label,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  items: { id: number; label: string }[];
  onAdd: (text: string) => void;
  onRemove: (id: number) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
          >
            {item.label}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="text-zinc-400 hover:text-red-600"
              aria-label={`Remove ${item.label}`}
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
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onAdd(draft.trim());
              setDraft("");
            }
          }}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="w-full max-w-xs rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            onAdd(draft.trim());
            setDraft("");
          }}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default function SearchConfigsEditor() {
  const { data: titles, mutate: mutateTitles } = useSWR<JobTitle[]>(
    "/job-titles",
    fetcher,
  );
  const { data: locations, mutate: mutateLocations } = useSWR<Location[]>(
    "/locations",
    fetcher,
  );
  const { data: configs, mutate: mutateConfigs } = useSWR<SearchConfig[]>(
    "/search-configs",
    fetcher,
  );

  const [newTitleId, setNewTitleId] = useState<number | "">("");
  const [newLocationId, setNewLocationId] = useState<number | "">("");
  const [newIsRemote, setNewIsRemote] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAddCombo() {
    setFormError(null);
    if (newTitleId === "" || newLocationId === "") {
      setFormError("Pick a title and a location");
      return;
    }
    try {
      await createSearchConfig({
        job_title_id: Number(newTitleId),
        location_id: Number(newLocationId),
        is_remote: newIsRemote,
      });
      mutateConfigs();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to add combo");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <EntityList
          label="Job Titles"
          items={(titles ?? []).map((t) => ({ id: t.id, label: t.term }))}
          onAdd={async (term) => {
            await createJobTitle(term);
            mutateTitles();
          }}
          onRemove={async (id) => {
            await deleteJobTitle(id);
            mutateTitles();
          }}
        />
        <EntityList
          label="Locations"
          items={(locations ?? []).map((l) => ({ id: l.id, label: l.name }))}
          onAdd={async (name) => {
            await createLocation(name);
            mutateLocations();
          }}
          onRemove={async (id) => {
            await deleteLocation(id);
            mutateLocations();
          }}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Search Combos
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Each row is one (title, location, remote) search JobSpy runs. Not every
          title needs to be paired with every location.
        </p>

        <ul className="space-y-1">
          {(configs ?? []).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
            >
              <span>
                <strong>{c.job_title.term}</strong> · {c.location.name}
                {c.is_remote && " (remote)"}
                {!c.active && (
                  <span className="ml-2 text-xs text-zinc-400">(inactive)</span>
                )}
              </span>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await updateSearchConfig(c.id, { active: !c.active });
                    mutateConfigs();
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteSearchConfig(c.id);
                    mutateConfigs();
                  }}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label="Remove combo"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <select
            value={newTitleId}
            onChange={(e) => setNewTitleId(e.target.value ? Number(e.target.value) : "")}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Title…</option>
            {(titles ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.term}
              </option>
            ))}
          </select>
          <select
            value={newLocationId}
            onChange={(e) =>
              setNewLocationId(e.target.value ? Number(e.target.value) : "")
            }
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Location…</option>
            {(locations ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={newIsRemote}
              onChange={(e) => setNewIsRemote(e.target.checked)}
            />
            Remote
          </label>
          <button
            type="button"
            onClick={handleAddCombo}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Add combo
          </button>
        </div>
        {formError && <p className="text-xs text-red-600">{formError}</p>}
      </div>
    </div>
  );
}
