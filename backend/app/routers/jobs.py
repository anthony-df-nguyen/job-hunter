"""Endpoints for tracked jobs: list/filter/sort, update status & notes,
delete, and the LLM resume-tailoring action. Jobs are created only by the
scraper, so there's no POST here. See job_titles.py for the shared FastAPI
plumbing notes."""

import openai
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.routers.common import apply_updates, get_or_404, get_settings_row

router = APIRouter(prefix="/jobs", tags=["jobs"])

# Whitelist of columns the client may sort by. Mapping the query-string
# value to a column object (instead of interpolating the raw string into
# the query) is what keeps this safe from SQL injection.
_SORTABLE_COLUMNS = {
    "date_seen": models.Job.date_seen,
    "title": models.Job.title,
    "company": models.Job.company,
    "salary_max": models.Job.salary_max,
}


@router.get("", response_model=list[schemas.JobRead])
def list_jobs(
    status_id: int | None = Query(default=None),
    search: str | None = Query(default=None, description="Matches title or company"),
    sort: str = Query(default="date_seen"),
    descending: bool = Query(default=True),
    limit: int = Query(default=200, le=1000),
    offset: int = Query(default=0),
    db: Session = Depends(get_db),
):
    # joinedload pulls each job's JobStatus in the same query, so
    # serializing the nested `status` field doesn't fire one extra
    # SELECT per job (the "N+1 queries" problem).
    q = db.query(models.Job).options(joinedload(models.Job.status))

    if status_id is not None:
        q = q.filter(models.Job.status_id == status_id)
    if search:
        # ilike = case-insensitive LIKE; % wildcards make it a substring match.
        like = f"%{search}%"
        q = q.filter(
            (models.Job.title.ilike(like)) | (models.Job.company.ilike(like))
        )

    sort_column = _SORTABLE_COLUMNS.get(sort, models.Job.date_seen)
    q = q.order_by(sort_column.desc() if descending else sort_column.asc())

    return q.offset(offset).limit(limit).all()


@router.delete("", status_code=204)
def delete_all_jobs(db: Session = Depends(get_db)):
    """Wipe the whole jobs table (the "clear all" button in the UI)."""
    db.query(models.Job).delete()
    db.commit()


@router.patch("/{job_id}", response_model=schemas.JobRead)
def update_job(job_id: int, payload: schemas.JobUpdate, db: Session = Depends(get_db)):
    row = get_or_404(db, models.Job, job_id, "Job")
    # SQLite doesn't enforce foreign keys by default, so verify the target
    # status exists before pointing the job at it.
    if payload.status_id is not None and db.get(models.JobStatus, payload.status_id) is None:
        raise HTTPException(422, "status_id does not exist")
    apply_updates(row, payload)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    row = get_or_404(db, models.Job, job_id, "Job")
    db.delete(row)
    db.commit()


@router.post("/{job_id}/tailor-resume", response_model=schemas.TailoredResumeRead)
def tailor_resume(job_id: int, db: Session = Depends(get_db)):
    """Send the job description + base resume to a local LLM (Ollama, via
    its OpenAI-compatible API) and return the tailored resume text. Nothing
    is stored — the frontend shows the result in a modal."""
    job = get_or_404(db, models.Job, job_id, "Job")
    if not job.description:
        raise HTTPException(400, "This job has no description to tailor against")

    settings = get_settings_row(db, models.AppSettings, "App settings")
    if not settings.base_resume_text:
        raise HTTPException(400, "Upload a base resume in Settings first")

    user_message = (
        f"Job title: {job.title}\n"
        f"Company: {job.company}\n\n"
        f"Job description:\n{job.description}\n\n"
        f"Base resume:\n{settings.base_resume_text}"
    )

    # Ollama ignores the API key but the OpenAI client requires one.
    client = openai.OpenAI(api_key="ollama", base_url=settings.llm_base_url)
    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": settings.system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
    except Exception as exc:
        # 502 = upstream failure: Ollama not running, model not pulled, etc.
        raise HTTPException(502, f"LLM request failed: {exc}") from exc

    resume = response.choices[0].message.content or ""
    return schemas.TailoredResumeRead(resume=resume)
