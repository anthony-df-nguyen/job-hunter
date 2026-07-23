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

  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newIsRemote, setNewIsRemote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  async function resolveJobTitleId(term: string): Promise<number> {
    const trimmed = term.trim();
    const existing = (titles ?? []).find(
      (t) => t.term.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;
    const created = await createJobTitle(trimmed);
    mutateTitles();
    return created.id;
  }

  async function resolveLocationId(name: string): Promise<number> {
    const trimmed = name.trim();
    const existing = (locations ?? []).find(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;
    const created = await createLocation(trimmed);
    mutateLocations();
    return created.id;
  }

  async function handleAddCombo() {
    setError(null);
    if (!newTitle.trim() || !newLocation.trim()) {
      setError("Enter a title and a location");
      return;
    }
    try {
      const [job_title_id, location_id] = await Promise.all([
        resolveJobTitleId(newTitle),
        resolveLocationId(newLocation),
      ]);
      await createSearchConfig({ job_title_id, location_id, is_remote: newIsRemote });
      setNewTitle("");
      setNewLocation("");
      setNewIsRemote(false);
      mutateConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add combo");
    }
  }

  async function handleRenameTitle(c: SearchConfig, term: string) {
    const trimmed = term.trim();
    if (!trimmed || trimmed === c.job_title.term) return;
    setError(null);
    try {
      const job_title_id = await resolveJobTitleId(trimmed);
      await updateSearchConfig(c.id, { job_title_id });
      mutateConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update title");
    }
  }

  async function handleRenameLocation(c: SearchConfig, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === c.location.name) return;
    setError(null);
    try {
      const location_id = await resolveLocationId(trimmed);
      await updateSearchConfig(c.id, { location_id });
      mutateConfigs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update location");
    }
  }

  async function handleCleanup() {
    setError(null);
    setCleanupMessage(null);
    const usedTitleIds = new Set((configs ?? []).map((c) => c.job_title_id));
    const usedLocationIds = new Set((configs ?? []).map((c) => c.location_id));
    const unusedTitles = (titles ?? []).filter((t) => !usedTitleIds.has(t.id));
    const unusedLocations = (locations ?? []).filter((l) => !usedLocationIds.has(l.id));
    try {
      await Promise.all([
        ...unusedTitles.map((t) => deleteJobTitle(t.id)),
        ...unusedLocations.map((l) => deleteLocation(l.id)),
      ]);
      mutateTitles();
      mutateLocations();
      setCleanupMessage(
        unusedTitles.length + unusedLocations.length === 0
          ? "Nothing to clean up — every title and location is used by a combo."
          : `Removed ${unusedTitles.length} unused title(s) and ${unusedLocations.length} unused location(s).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clean up");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Each row is one search JobSpy runs — not every title needs to be paired with
        every location. <strong>Location</strong> is the place text sent to the job
        board (type &ldquo;Remote&rdquo; for a nationwide search with no city attached).{" "}
        <strong>Remote-only</strong> is a separate filter on top of that: check it to
        restrict results to remote listings for whatever location you typed — e.g.
        title=&ldquo;Data Scientist&rdquo;, location=&ldquo;Orange County, CA&rdquo;,
        remote-only=checked finds remote roles based near Orange County, not just jobs
        physically in it.
      </p>

      <ul className="space-y-1">
        {(configs ?? []).map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800"
          >
            <span className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                list="job-title-options"
                defaultValue={c.job_title.term}
                onBlur={(e) => handleRenameTitle(c, e.target.value)}
                className="rounded-md border border-transparent bg-transparent px-1 py-0.5 font-medium hover:border-zinc-300 focus:border-zinc-300 dark:hover:border-zinc-700 dark:focus:border-zinc-700"
              />
              <span className="text-zinc-400">·</span>
              <input
                type="text"
                list="location-options"
                defaultValue={c.location.name}
                onBlur={(e) => handleRenameLocation(c, e.target.value)}
                className="rounded-md border border-transparent bg-transparent px-1 py-0.5 hover:border-zinc-300 focus:border-zinc-300 dark:hover:border-zinc-700 dark:focus:border-zinc-700"
              />
              <label className="flex items-center gap-1 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={c.is_remote}
                  onChange={async (e) => {
                    await updateSearchConfig(c.id, { is_remote: e.target.checked });
                    mutateConfigs();
                  }}
                />
                Remote-only
              </label>
              {!c.active && (
                <span className="text-xs text-zinc-400">(inactive)</span>
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
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCombo()}
          list="job-title-options"
          placeholder="Title…"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCombo()}
          list="location-options"
          placeholder="Location…"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={newIsRemote}
            onChange={(e) => setNewIsRemote(e.target.checked)}
          />
          Remote-only
        </label>
        <button
          type="button"
          onClick={handleAddCombo}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Add combo
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleCleanup}
          className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Clean up unused titles &amp; locations
        </button>
        {cleanupMessage && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{cleanupMessage}</p>
        )}
      </div>

      <datalist id="job-title-options">
        {(titles ?? []).map((t) => (
          <option key={t.id} value={t.term} />
        ))}
      </datalist>
      <datalist id="location-options">
        {(locations ?? []).map((l) => (
          <option key={l.id} value={l.name} />
        ))}
      </datalist>
    </div>
  );
}
