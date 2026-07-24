"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, updateRunSettings } from "@/lib/api";
import type { RunSettings } from "@/lib/types";

const AVAILABLE_SITES = ["linkedin", "indeed", "zip_recruiter", "glassdoor"];

export default function RunSettingsForm() {
  const { data, mutate } = useSWR<RunSettings>("/run-settings", fetcher);
  const [form, setForm] = useState<RunSettings | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<RunSettings | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed local edit state from the fetched settings once they arrive, without
  // an effect — React's recommended pattern for adjusting state during render
  // when an external value changes (avoids the extra render an effect causes).
  if (data && data !== loadedFrom) {
    setLoadedFrom(data);
    setForm(data);
  }

  if (!form) return null;

  async function handleSave() {
    if (!form) return;
    await updateRunSettings(form);
    mutate();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function toggleSite(site: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            sites: prev.sites.includes(site)
              ? prev.sites.filter((s) => s !== site)
              : [...prev.sites, site],
          }
        : prev,
    );
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Search Theses Sites</h3>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_SITES.map((site) => (
            <label key={site} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={form.sites.includes(site)}
                onChange={() => toggleSite(site)}
              />
              {site}
            </label>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Results per search
        </span>
        <input
          type="number"
          value={form.results_per_search}
          onChange={(e) =>
            setForm({ ...form, results_per_search: Number(e.target.value) })
          }
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Hours old (max posting age)
        </span>
        <input
          type="number"
          value={form.hours_old}
          onChange={(e) => setForm({ ...form, hours_old: Number(e.target.value) })}
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Minimum salary floor
        </span>
        <input
          type="number"
          value={form.min_salary ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              min_salary: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.include_jobs_without_salary}
          onChange={(e) =>
            setForm({ ...form, include_jobs_without_salary: e.target.checked })
          }
        />
        Keep jobs with no listed salary
      </label>

      <button
        type="button"
        onClick={handleSave}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
