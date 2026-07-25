"""Pydantic schemas — the shapes of the API's request and response JSON.

These are separate from the SQLAlchemy models on purpose: models.py
describes what's stored in the database, this file describes what goes
over the wire, and the two don't have to match (e.g. clients can never set
a Job's `url`, and `Run.id` is server-generated).

Each resource follows the same three-schema convention:

- `XxxCreate` — POST body. Required fields have no default; FastAPI
  rejects a request missing them with an automatic 422.
- `XxxUpdate` — PATCH/PUT body. Every field is `| None = None` (optional)
  so clients send only the fields they want to change; the routers apply
  them with `model_dump(exclude_unset=True)`, which skips fields that
  weren't in the request at all.
- `XxxRead` — response shape. `from_attributes=True` lets Pydantic build
  it straight from a SQLAlchemy ORM object (reading attributes instead of
  dict keys), which is why endpoints can just `return row`.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


# ── Job titles ──────────────────────────────────────────────────────────────


class JobTitleCreate(BaseModel):
    term: str
    active: bool = True


class JobTitleUpdate(BaseModel):
    term: str | None = None
    active: bool | None = None


class JobTitleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    term: str
    active: bool


# ── Locations ────────────────────────────────────────────────────────────────


class LocationCreate(BaseModel):
    name: str
    active: bool = True


class LocationUpdate(BaseModel):
    name: str | None = None
    active: bool | None = None


class LocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    active: bool


# ── Search configs ───────────────────────────────────────────────────────────


class SearchConfigCreate(BaseModel):
    job_title_id: int
    location_id: int
    is_remote: bool = False
    active: bool = True


class SearchConfigUpdate(BaseModel):
    job_title_id: int | None = None
    location_id: int | None = None
    is_remote: bool | None = None
    active: bool | None = None


class SearchConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    job_title_id: int
    location_id: int
    is_remote: bool
    active: bool
    job_title: JobTitleRead
    location: LocationRead


# ── Keyword rules ─────────────────────────────────────────────────────────────


class KeywordRuleCreate(BaseModel):
    keyword: str
    category: str
    active: bool = True


class KeywordRuleUpdate(BaseModel):
    keyword: str | None = None
    active: bool | None = None


class KeywordRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    keyword: str
    category: str
    active: bool


# ── Job statuses ─────────────────────────────────────────────────────────────


class JobStatusCreate(BaseModel):
    name: str
    sort_order: int = 0
    is_default: bool = False
    color: str = "#71717a"


class JobStatusUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    is_default: bool | None = None
    color: str | None = None


class JobStatusRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    sort_order: int
    is_default: bool
    color: str


# ── Run settings ──────────────────────────────────────────────────────────────


class RunSettingsUpdate(BaseModel):
    sites: list[str] | None = None
    results_per_search: int | None = None
    hours_old: int | None = None
    min_salary: int | None = None
    include_jobs_without_salary: bool | None = None


class RunSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sites: list[str]
    results_per_search: int
    hours_old: int
    min_salary: int | None
    include_jobs_without_salary: bool


# ── App settings ──────────────────────────────────────────────────────────────


class AppSettingsUpdate(BaseModel):
    system_prompt: str | None = None
    llm_base_url: str | None = None
    llm_model: str | None = None


class AppSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    base_resume_text: str
    base_resume_filename: str | None
    system_prompt: str
    llm_base_url: str
    llm_model: str


class TailoredResumeRead(BaseModel):
    resume: str


# ── Jobs ──────────────────────────────────────────────────────────────────────


class JobUpdate(BaseModel):
    status_id: int | None = None
    notes: str | None = None


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date_seen: date
    title: str
    company: str
    location: str
    is_remote: bool
    url: str
    status_id: int
    status: JobStatusRead
    notes: str
    site: str
    salary_min: float | None
    salary_max: float | None
    salary_interval: str | None
    description: str | None
    search_config_id: int | None
    run_id: int | None


# ── Runs ──────────────────────────────────────────────────────────────────────


class RunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    started_at: datetime
    finished_at: datetime | None
    status: str
    cancel_requested: bool
    current_search_title: str | None
    current_search_location: str | None
    current_search_is_remote: bool | None
    progress_completed: int
    progress_total: int
    new_jobs_count: int
    filtered_count: int
    skipped_seen_count: int
    error_message: str | None
