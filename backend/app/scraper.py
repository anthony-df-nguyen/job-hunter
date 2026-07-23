"""
Scraping + filtering logic ported from job_search_csv.py. The JobSpy call
and its two LinkedIn workarounds are unchanged; the parts that used to read
module-level constants (SEARCHES, GOOD_TITLE_KEYWORDS, MIN_SALARY, ...) now
read that config from the database instead, since it's user-editable.
"""

import math
from datetime import date, datetime

from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from jobspy import scrape_jobs
from jobspy.linkedin import LinkedIn as _LinkedInScraper
from jobspy.linkedin.util import parse_company_industry, parse_job_level, parse_job_type
from jobspy.model import Compensation, Country, DescriptionFormat
from jobspy.util import currency_parser, markdown_converter, remove_attributes

from app import models
from app.database import SessionLocal

# ── LinkedIn workarounds (unchanged from job_search_csv.py) ──────────────────
#
# 1. Country.from_string raises ValueError on countries JobSpy doesn't know
#    about (e.g. "North Macedonia"), which aborts the whole search instead of
#    just that one listing — patched to fall back to the raw string.
# 2. LinkedIn moved its inline salary badge from job-search-card__salary-info
#    to main-job-card__salary-info on the per-job detail page; JobSpy's
#    search-card lookup no longer finds it, so this re-fetches the detail
#    page (already being fetched for the description) and parses the new
#    class name, attaching it whenever the default lookup came up empty.

_original_country_from_string = Country.from_string.__func__


def _safe_country_from_string(cls, country_str: str):
    try:
        return _original_country_from_string(cls, country_str)
    except ValueError:
        return country_str


Country.from_string = classmethod(_safe_country_from_string)

_original_process_job = _LinkedInScraper._process_job
_detail_page_compensation_cache: dict[str, Compensation | None] = {}


def _patched_get_job_details(self, job_id: str) -> dict:
    try:
        response = self.session.get(f"{self.base_url}/jobs/view/{job_id}", timeout=5)
        response.raise_for_status()
    except Exception:
        return {}
    if "linkedin.com/signup" in response.url:
        return {}

    soup = BeautifulSoup(response.text, "html.parser")
    div_content = soup.find(
        "div", class_=lambda x: x and "show-more-less-html__markup" in x
    )
    description = None
    if div_content is not None:
        div_content = remove_attributes(div_content)
        description = div_content.prettify(formatter="html")
        if self.scraper_input.description_format == DescriptionFormat.MARKDOWN:
            description = markdown_converter(description)

    h3_tag = soup.find(
        "h3", string=lambda text: text and "Job function" in text.strip()
    )
    job_function = None
    if h3_tag:
        job_function_span = h3_tag.find_next(
            "span", class_="description__job-criteria-text"
        )
        if job_function_span:
            job_function = job_function_span.text.strip()

    company_logo = (
        logo_image.get("data-delayed-url")
        if (logo_image := soup.find("img", {"class": "artdeco-entity-image"}))
        else None
    )

    compensation = None
    salary_tag = soup.find("span", class_="main-job-card__salary-info")
    if salary_tag:
        salary_text = salary_tag.get_text(separator=" ").strip()
        parts = [p for p in salary_text.split("-") if p.strip()]
        if len(parts) == 2:
            try:
                compensation = Compensation(
                    min_amount=int(currency_parser(parts[0])),
                    max_amount=int(currency_parser(parts[1])),
                    currency="USD",
                )
            except Exception:
                compensation = None
    _detail_page_compensation_cache[job_id] = compensation

    return {
        "description": description,
        "job_level": parse_job_level(soup),
        "company_industry": parse_company_industry(soup),
        "job_type": parse_job_type(soup),
        "job_url_direct": self._parse_job_url_direct(soup),
        "company_logo": company_logo,
        "job_function": job_function,
    }


def _patched_process_job(self, job_card, job_id, full_descr):
    job_post = _original_process_job(self, job_card, job_id, full_descr)
    if job_post is not None and job_post.compensation is None:
        cached = _detail_page_compensation_cache.pop(job_id, None)
        if cached is not None:
            job_post.compensation = cached
    return job_post


_LinkedInScraper._get_job_details = _patched_get_job_details
_LinkedInScraper._process_job = _patched_process_job


# ── Helpers ───────────────────────────────────────────────────────────────────


def normalize_url(url: str) -> str:
    """Strip tracking params from LinkedIn URLs for cleaner deduplication —
    Indeed encodes its job ID in the query string, so only LinkedIn is safe
    to strip (unchanged from job_search_csv.py)."""
    if not url:
        return ""
    if "linkedin.com" in url:
        url = url.split("?")[0]
    return url.rstrip("/")


def _safe_str(val) -> str:
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return ""
    return str(val)


def _safe_num(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    return val


class KeywordRules:
    """Keyword lists loaded from the DB once per run, grouped by category —
    replaces the GOOD_TITLE_KEYWORDS / SKIP_TITLE_KEYWORDS /
    SKIP_DESCRIPTION_KEYWORDS / CONTRACT_KEYWORDS module constants."""

    def __init__(self, db: Session):
        rows = db.query(models.KeywordRule).filter_by(active=True).all()
        self.good_title = [r.keyword.lower() for r in rows if r.category == "good_title"]
        self.skip_title = [r.keyword.lower() for r in rows if r.category == "skip_title"]
        self.skip_description = [
            r.keyword.lower() for r in rows if r.category == "skip_description"
        ]
        self.contract_type = [
            r.keyword.lower() for r in rows if r.category == "contract_type"
        ]


def passes_filters(
    job,
    rules: KeywordRules,
    min_salary: int | None,
    include_jobs_without_salary: bool,
) -> tuple[bool, str]:
    """Same checks as job_search_csv.py's passes_filters(): title must match
    a good_title keyword (skipped entirely if that list is empty, so an
    unconfigured list doesn't reject every job), title/description/job_type
    must not match a skip keyword, and salary must clear the floor unless
    it's missing and missing-salary jobs are allowed."""

    title = _safe_str(job.get("title")).lower()
    description = _safe_str(job.get("description")).lower()

    if rules.good_title and not any(kw in title for kw in rules.good_title):
        return False, f"Title not a target role: '{job.get('title')}'"

    for kw in rules.skip_title:
        if kw in title:
            return False, f"Bad title keyword: '{kw}'"

    for kw in rules.skip_description:
        if kw in description:
            return False, f"Deal-breaker in description: '{kw}'"

    job_type = str(job.get("job_type") or "").lower()
    for kw in rules.contract_type:
        if kw in title or kw in job_type:
            return False, f"Contract/temp role: '{kw}' in title or job_type"

    min_amount = job.get("min_amount")
    max_amount = job.get("max_amount")
    interval_raw = job.get("interval")
    interval = (
        str(interval_raw).lower() if interval_raw and str(interval_raw) != "nan" else ""
    )
    salary_present = (
        interval == "yearly"
        and min_amount not in (None, float("nan"))
        and max_amount not in (None, float("nan"))
    )
    if not salary_present:
        if include_jobs_without_salary:
            return True, ""
        return False, "No salary listed"

    if min_salary is not None and float(max_amount) < min_salary:
        return (
            False,
            f"Salary below floor: max ${float(max_amount):,.0f} < ${min_salary:,}",
        )

    return True, ""


def build_job_kwargs(
    job, run_id: int, search_config_id: int, default_status_id: int, today: date
) -> dict:
    """Equivalent of job_search_csv.py's build_tracker_row(), returning
    kwargs for a Job ORM row instead of a CSV row list."""

    min_amount = _safe_num(job.get("min_amount"))
    max_amount = _safe_num(job.get("max_amount"))
    interval_raw = job.get("interval")
    interval = (
        str(interval_raw).lower() if interval_raw and str(interval_raw) != "nan" else None
    )

    return dict(
        date_seen=today,
        title=job.get("title") or "N/A",
        company=job.get("company") or "N/A",
        location=job.get("location") or "N/A",
        is_remote=bool(job.get("is_remote")),
        url=job.get("job_url") or "N/A",
        status_id=default_status_id,
        notes="",
        site=(job.get("site") or "").capitalize(),
        salary_min=min_amount,
        salary_max=max_amount,
        salary_interval=interval,
        search_config_id=search_config_id,
        run_id=run_id,
    )


# ── Main run loop ─────────────────────────────────────────────────────────────


def run_scrape(run_id: int) -> None:
    """Executed in a background thread by FastAPI's BackgroundTasks (Starlette
    runs sync background callables via a threadpool), so it opens its own DB
    session rather than reusing the request-scoped one, which is already
    closed by the time this runs. Mirrors job_search_csv.py's main(): loop
    over active search configs, scrape, dedupe, filter, and insert new jobs
    — but writes current_search_*/progress to the Run row as it goes instead
    of printing, so the frontend can poll for status."""

    import pandas as pd

    db = SessionLocal()
    try:
        run = db.get(models.Run, run_id)
        if run is None:
            return

        search_configs = db.query(models.SearchConfig).filter_by(active=True).all()
        run.progress_total = len(search_configs)
        db.commit()

        if not search_configs:
            run.status = "error"
            run.error_message = "No active search combos configured"
            run.finished_at = datetime.utcnow()
            db.commit()
            return

        run_settings = db.get(models.RunSettings, 1)
        rules = KeywordRules(db)
        default_status = db.query(models.JobStatus).filter_by(is_default=True).first()
        if default_status is None:
            default_status = (
                db.query(models.JobStatus).order_by(models.JobStatus.sort_order).first()
            )

        seen_urls = {normalize_url(u) for (u,) in db.query(models.Job.url).all()}
        today = date.today()
        all_jobs = []

        for i, config in enumerate(search_configs):
            run.current_search_title = config.job_title.term
            run.current_search_location = config.location.name
            run.current_search_is_remote = config.is_remote
            run.progress_completed = i
            db.commit()

            try:
                jobs = scrape_jobs(
                    site_name=run_settings.sites,
                    search_term=config.job_title.term,
                    location=config.location.name,
                    is_remote=config.is_remote,
                    results_wanted=run_settings.results_per_search,
                    hours_old=run_settings.hours_old,
                    country_indeed="USA",
                    linkedin_fetch_description=True,
                )
                jobs["_search_config_id"] = config.id
                all_jobs.append(jobs)
            except Exception:
                # One bad search shouldn't abort the whole run.
                continue

        run.progress_completed = len(search_configs)
        db.commit()

        if not all_jobs:
            run.status = "done"
            run.finished_at = datetime.utcnow()
            db.commit()
            return

        raw = pd.concat(all_jobs, ignore_index=True)
        raw["_normalized_url"] = raw["job_url"].apply(
            lambda u: normalize_url(u) if isinstance(u, str) else ""
        )
        combined = raw.drop_duplicates(subset="_normalized_url")

        new_jobs_count = 0
        filtered_count = 0
        skipped_seen_count = 0

        for _, row in combined.iterrows():
            job = row.to_dict()
            norm_url = normalize_url(job.get("job_url") or "")

            if norm_url in seen_urls:
                skipped_seen_count += 1
                continue

            passed, _reason = passes_filters(
                job,
                rules,
                run_settings.min_salary,
                run_settings.include_jobs_without_salary,
            )
            if not passed:
                filtered_count += 1
                continue

            kwargs = build_job_kwargs(
                job,
                run_id=run.id,
                search_config_id=int(job["_search_config_id"]),
                default_status_id=default_status.id,
                today=today,
            )
            db.add(models.Job(**kwargs))
            seen_urls.add(norm_url)
            new_jobs_count += 1

        run.new_jobs_count = new_jobs_count
        run.filtered_count = filtered_count
        run.skipped_seen_count = skipped_seen_count
        run.status = "done"
        run.finished_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        run = db.get(models.Run, run_id)
        if run is not None:
            run.status = "error"
            run.error_message = str(e)
            run.finished_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
