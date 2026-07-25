"""
Populates a fresh database with the same defaults job_search_csv.py used to
hardcode as module constants. Each seed function is idempotent — it only
inserts if the table is empty — so calling seed_all() on every startup is
safe and never overwrites user edits.
"""

from sqlalchemy.orm import Session

from app.models import (
    AppSettings,
    JobStatus,
    JobTitle,
    KeywordRule,
    Location,
    RunSettings,
    SearchConfig,
)

DEFAULT_SYSTEM_PROMPT = (
    "You are an expert resume writer. Rewrite the candidate's base resume to "
    "better match the target job description, emphasizing relevant "
    "experience and keywords from the posting. Keep it truthful — never "
    "invent experience, employers, or skills the candidate doesn't have. "
    "Keep the same overall structure and length as the base resume. Output "
    "only the tailored resume text, no commentary."
)

DEFAULT_JOB_STATUSES = [
    # (name, is_default, color) — colors chosen to contextually match the stage:
    # blue "new", yellow "under review", violet "applied", orange "interviewing"
    # (active/hot), red "pass" (rejected/declined), gray "closed" (inactive).
    ("New", True, "#3b82f6"),
    ("Reviewing", False, "#eab308"),
    ("Applied", False, "#8b5cf6"),
    ("Interviewing", False, "#f97316"),
    ("Pass", False, "#ef4444"),
    ("Closed", False, "#71717a"),
]

DEFAULT_GOOD_TITLE_KEYWORDS = ["data scientist", "senior data analyst"]

DEFAULT_SKIP_TITLE_KEYWORDS = [
    "manager",
    "director",
    "vp ",
    "vice president",
    "head of",
    "chief",
    "junior",
    "jr.",
    "jr ",
    "entry level",
    "entry-level",
    "internship",
    "intern",
    "analyst i ",
]

DEFAULT_SKIP_DESCRIPTION_KEYWORDS = [
    "relocation required",
    "must relocate",
    "willing to relocate",
    "travel required",
    "frequent travel",
    "50% travel",
    "75% travel",
]

DEFAULT_CONTRACT_KEYWORDS = [
    "contract",
    "contractor",
    "freelance",
    "temp ",
    "temporary",
    "c2c",
    "corp-to-corp",
]


def seed_job_statuses(db: Session) -> None:
    if db.query(JobStatus).count() > 0:
        return
    for order, (name, is_default, color) in enumerate(DEFAULT_JOB_STATUSES):
        db.add(
            JobStatus(name=name, sort_order=order, is_default=is_default, color=color)
        )
    db.commit()


def seed_keyword_rules(db: Session) -> None:
    if db.query(KeywordRule).count() > 0:
        return
    for kw in DEFAULT_GOOD_TITLE_KEYWORDS:
        db.add(KeywordRule(keyword=kw, category="good_title"))
    for kw in DEFAULT_SKIP_TITLE_KEYWORDS:
        db.add(KeywordRule(keyword=kw, category="skip_title"))
    for kw in DEFAULT_SKIP_DESCRIPTION_KEYWORDS:
        db.add(KeywordRule(keyword=kw, category="skip_description"))
    for kw in DEFAULT_CONTRACT_KEYWORDS:
        db.add(KeywordRule(keyword=kw, category="contract_type"))
    db.commit()


def seed_run_settings(db: Session) -> None:
    if db.query(RunSettings).count() > 0:
        return
    db.add(
        RunSettings(
            id=1,
            sites=["linkedin", "indeed"],
            results_per_search=50,
            hours_old=24,
            min_salary=100_000,
            include_jobs_without_salary=True,
        )
    )
    db.commit()


def seed_app_settings(db: Session) -> None:
    if db.query(AppSettings).count() > 0:
        return
    db.add(AppSettings(id=1, system_prompt=DEFAULT_SYSTEM_PROMPT))
    db.commit()


def seed_locations(db: Session) -> None:
    """Guarantees the "Remote" location always exists, independent of whether any
    search combos exist — it's a magic value the location field's autocomplete and
    helper text point users at, so it shouldn't require reading instructions to
    recreate if a user's default combos (and thus this row) ever get cleaned up."""
    if db.query(Location).filter_by(name="Remote").first() is None:
        db.add(Location(name="Remote"))
        db.commit()


def seed_titles_locations_and_searches(db: Session) -> None:
    if db.query(SearchConfig).count() > 0:
        return

    data_scientist = db.query(JobTitle).filter_by(term="Data Scientist").first()
    if data_scientist is None:
        data_scientist = JobTitle(term="Data Scientist")
        db.add(data_scientist)
        db.flush()

    remote = db.query(Location).filter_by(name="Remote").first()
    if remote is None:
        remote = Location(name="Remote")
        db.add(remote)
        db.flush()

    orange_county = db.query(Location).filter_by(name="Orange County, CA").first()
    if orange_county is None:
        orange_county = Location(name="Orange County, CA")
        db.add(orange_county)
        db.flush()

    db.add_all(
        [
            SearchConfig(
                job_title_id=data_scientist.id, location_id=remote.id, is_remote=True
            ),
            SearchConfig(
                job_title_id=data_scientist.id,
                location_id=orange_county.id,
                is_remote=False,
            ),
            SearchConfig(
                job_title_id=data_scientist.id,
                location_id=orange_county.id,
                is_remote=True,
            ),
        ]
    )
    db.commit()


def seed_all(db: Session) -> None:
    seed_job_statuses(db)
    seed_keyword_rules(db)
    seed_run_settings(db)
    seed_app_settings(db)
    seed_locations(db)
    seed_titles_locations_and_searches(db)
