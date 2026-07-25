"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { fetcher, updateAppSettings, uploadResume } from "@/lib/api";
import type { AppSettings } from "@/lib/types";

export default function AppSettingsForm() {
  const { data, mutate } = useSWR<AppSettings>("/app-settings", fetcher);
  const [form, setForm] = useState<AppSettings | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed local edit state from the fetched settings once they arrive, without
  // an effect — same pattern as RunSettingsForm.
  if (data && data !== loadedFrom) {
    setLoadedFrom(data);
    setForm(data);
  }

  if (!form) return null;

  async function handleSave() {
    if (!form) return;
    await updateAppSettings({
      system_prompt: form.system_prompt,
      llm_base_url: form.llm_base_url,
      llm_model: form.llm_model,
    });
    mutate();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadResume(file);
      mutate();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Base resume
        </span>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {form.base_resume_filename
            ? `Current: ${form.base_resume_filename}`
            : "No resume uploaded yet"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          disabled={uploading}
          className="block text-sm text-zinc-700 dark:text-zinc-300"
        />
        {uploading && <p className="text-xs text-zinc-500">Uploading…</p>}
        {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          System prompt
        </span>
        <textarea
          value={form.system_prompt}
          onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
          rows={6}
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Ollama base URL
        </span>
        <input
          type="text"
          value={form.llm_base_url}
          onChange={(e) => setForm({ ...form, llm_base_url: e.target.value })}
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Model name
        </span>
        <input
          type="text"
          value={form.llm_model}
          onChange={(e) => setForm({ ...form, llm_model: e.target.value })}
          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
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
