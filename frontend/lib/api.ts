import type {
  AppSettings,
  Job,
  JobStatus,
  JobTitle,
  KeywordCategory,
  KeywordRule,
  Location,
  Run,
  RunSettings,
  SearchConfig,
  TailoredResume,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// SWR fetcher — just a GET by key (the URL path).
export const fetcher = <T>(path: string) => request<T>(path);

// ── Job titles ────────────────────────────────────────────────────────────

export const createJobTitle = (term: string) =>
  request<JobTitle>("/job-titles", { method: "POST", body: JSON.stringify({ term }) });

export const deleteJobTitle = (id: number) =>
  request<void>(`/job-titles/${id}`, { method: "DELETE" });

// ── Locations ─────────────────────────────────────────────────────────────

export const createLocation = (name: string) =>
  request<Location>("/locations", { method: "POST", body: JSON.stringify({ name }) });

export const deleteLocation = (id: number) =>
  request<void>(`/locations/${id}`, { method: "DELETE" });

// ── Search configs ────────────────────────────────────────────────────────

export const createSearchConfig = (payload: {
  job_title_id: number;
  location_id: number;
  is_remote: boolean;
}) =>
  request<SearchConfig>("/search-configs", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateSearchConfig = (
  id: number,
  payload: Partial<{
    job_title_id: number;
    location_id: number;
    is_remote: boolean;
    active: boolean;
  }>,
) =>
  request<SearchConfig>(`/search-configs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteSearchConfig = (id: number) =>
  request<void>(`/search-configs/${id}`, { method: "DELETE" });

// ── Keyword rules ─────────────────────────────────────────────────────────

export const createKeywordRule = (keyword: string, category: KeywordCategory) =>
  request<KeywordRule>("/keyword-rules", {
    method: "POST",
    body: JSON.stringify({ keyword, category }),
  });

export const deleteKeywordRule = (id: number) =>
  request<void>(`/keyword-rules/${id}`, { method: "DELETE" });

// ── Job statuses ──────────────────────────────────────────────────────────

export const createStatus = (name: string, sort_order: number, color?: string) =>
  request<JobStatus>("/statuses", {
    method: "POST",
    body: JSON.stringify({ name, sort_order, ...(color ? { color } : {}) }),
  });

export const updateStatus = (
  id: number,
  payload: Partial<{ name: string; sort_order: number; is_default: boolean; color: string }>,
) =>
  request<JobStatus>(`/statuses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteStatus = (id: number) =>
  request<void>(`/statuses/${id}`, { method: "DELETE" });

// ── Run settings ──────────────────────────────────────────────────────────

export const updateRunSettings = (payload: Partial<RunSettings>) =>
  request<RunSettings>("/run-settings", { method: "PUT", body: JSON.stringify(payload) });

// ── App settings ──────────────────────────────────────────────────────────

export const updateAppSettings = (payload: Partial<AppSettings>) =>
  request<AppSettings>("/app-settings", { method: "PUT", body: JSON.stringify(payload) });

export async function uploadResume(file: File): Promise<AppSettings> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/app-settings/resume`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Jobs ──────────────────────────────────────────────────────────────────

export const updateJob = (id: number, payload: Partial<{ status_id: number; notes: string }>) =>
  request<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteJob = (id: number) => request<void>(`/jobs/${id}`, { method: "DELETE" });

export const deleteAllJobs = () => request<void>("/jobs", { method: "DELETE" });

export const tailorResume = (id: number) =>
  request<TailoredResume>(`/jobs/${id}/tailor-resume`, { method: "POST" });

// ── Runs ──────────────────────────────────────────────────────────────────

export const startRun = () => request<Run>("/runs", { method: "POST" });

export const cancelRun = (id: number) =>
  request<Run>(`/runs/${id}/cancel`, { method: "POST" });
