export interface JobTitle {
  id: number;
  term: string;
  active: boolean;
}

export interface Location {
  id: number;
  name: string;
  active: boolean;
}

export interface SearchConfig {
  id: number;
  job_title_id: number;
  location_id: number;
  is_remote: boolean;
  active: boolean;
  job_title: JobTitle;
  location: Location;
}

export type KeywordCategory =
  | "good_title"
  | "skip_title"
  | "skip_description"
  | "contract_type";

export interface KeywordRule {
  id: number;
  keyword: string;
  category: KeywordCategory;
  active: boolean;
}

export interface JobStatus {
  id: number;
  name: string;
  sort_order: number;
  is_default: boolean;
  color: string;
}

export interface AppSettings {
  base_resume_text: string;
  base_resume_filename: string | null;
  system_prompt: string;
  llm_base_url: string;
  llm_model: string;
}

export interface TailoredResume {
  resume: string;
}

export interface RunSettings {
  sites: string[];
  results_per_search: number;
  hours_old: number;
  min_salary: number | null;
  include_jobs_without_salary: boolean;
}

export interface Job {
  id: number;
  date_seen: string;
  title: string;
  company: string;
  location: string;
  is_remote: boolean;
  url: string;
  status_id: number;
  status: JobStatus;
  notes: string;
  site: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_interval: string | null;
  description: string | null;
  search_config_id: number | null;
  run_id: number | null;
}

export type RunStatus = "running" | "done" | "error" | "cancelled";

export interface Run {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  cancel_requested: boolean;
  current_search_title: string | null;
  current_search_location: string | null;
  current_search_is_remote: boolean | null;
  progress_completed: number;
  progress_total: number;
  new_jobs_count: number;
  filtered_count: number;
  skipped_seen_count: number;
  error_message: string | null;
}
