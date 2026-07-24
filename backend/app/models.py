from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Fixed set of categories for KeywordRule.category — kept as a plain tuple
# (not a DB enum) so adding a category later is a data change, not a migration.
KEYWORD_CATEGORIES = ("good_title", "skip_title", "skip_description", "contract_type")

# Fixed set of values for Run.status.
RUN_STATUSES = ("running", "done", "error", "cancelled")


class JobTitle(Base):
    __tablename__ = "job_titles"

    id: Mapped[int] = mapped_column(primary_key=True)
    term: Mapped[str] = mapped_column(String, unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class SearchConfig(Base):
    """One (title, location, remote) combo to run each scrape — an explicit
    join rather than a title x location cross-product, matching the original
    script's SEARCHES list (e.g. the same location could appear once with
    is_remote=True and once with is_remote=False)."""

    __tablename__ = "search_configs"
    __table_args__ = (
        UniqueConstraint(
            "job_title_id", "location_id", "is_remote", name="uq_search_combo"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    job_title_id: Mapped[int] = mapped_column(ForeignKey("job_titles.id"))
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"))
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    job_title: Mapped[JobTitle] = relationship()
    location: Mapped[Location] = relationship()


class KeywordRule(Base):
    """Replaces GOOD_TITLE_KEYWORDS / SKIP_TITLE_KEYWORDS /
    SKIP_DESCRIPTION_KEYWORDS / CONTRACT_KEYWORDS. `category` selects which
    of those four lists this keyword belongs to; the filtering logic for
    each category lives in scraper.passes_filters(), same as it did as
    separate module constants."""

    __tablename__ = "keyword_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    keyword: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class JobStatus(Base):
    """User-editable pipeline stages (seeded with New/Reviewing/Applied/
    Interviewing/Pass/Closed). `is_default` marks the status newly-scraped
    jobs get assigned; exactly one row should have is_default=True."""

    __tablename__ = "job_statuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    color: Mapped[str] = mapped_column(String, default="#71717a")


class RunSettings(Base):
    """Singleton row (id is always 1) holding the global scrape knobs that
    used to be module constants: SITES, RESULTS_PER_SEARCH, HOURS_OLD,
    MIN_SALARY, INCLUDE_JOBS_WITHOUT_SALARY."""

    __tablename__ = "run_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    sites: Mapped[list] = mapped_column(JSON, default=list)
    results_per_search: Mapped[int] = mapped_column(Integer, default=50)
    hours_old: Mapped[int] = mapped_column(Integer, default=24)
    min_salary: Mapped[int | None] = mapped_column(Integer, nullable=True)
    include_jobs_without_salary: Mapped[bool] = mapped_column(Boolean, default=True)


class Job(Base):
    """One tracked job posting — replaces a row in job_tracker.csv."""

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    date_seen: Mapped[date] = mapped_column(Date)
    title: Mapped[str] = mapped_column(String)
    company: Mapped[str] = mapped_column(String)
    location: Mapped[str] = mapped_column(String)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    url: Mapped[str] = mapped_column(String, unique=True, index=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("job_statuses.id"))
    notes: Mapped[str] = mapped_column(Text, default="")
    site: Mapped[str] = mapped_column(String, default="")
    salary_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_interval: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_config_id: Mapped[int | None] = mapped_column(
        ForeignKey("search_configs.id"), nullable=True
    )
    run_id: Mapped[int | None] = mapped_column(ForeignKey("runs.id"), nullable=True)

    status: Mapped[JobStatus] = relationship()


class Run(Base):
    """One scrape execution — replaces a row in search_log.csv, extended
    with live-progress fields the frontend polls (see scraper.run_scrape)."""

    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String, default="running")
    cancel_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    current_search_title: Mapped[str | None] = mapped_column(String, nullable=True)
    current_search_location: Mapped[str | None] = mapped_column(String, nullable=True)
    current_search_is_remote: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True
    )
    progress_completed: Mapped[int] = mapped_column(Integer, default=0)
    progress_total: Mapped[int] = mapped_column(Integer, default=0)
    new_jobs_count: Mapped[int] = mapped_column(Integer, default=0)
    filtered_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_seen_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
