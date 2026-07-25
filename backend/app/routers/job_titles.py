"""CRUD endpoints for job titles (the search terms sent to job boards).

FastAPI plumbing notes (the same pattern appears in every router here):

- `APIRouter(prefix=...)` groups related endpoints under one URL prefix;
  main.py mounts each router onto the app.
- `db: Session = Depends(get_db)` is dependency injection: FastAPI calls
  get_db() to open a database session for each request and closes it when
  the request finishes, so endpoints never manage connections themselves.
- `response_model=` tells FastAPI which Pydantic schema to serialize the
  return value through — extra ORM attributes are filtered out and the
  shape is documented in /docs automatically.
- `payload: schemas.XxxCreate` makes FastAPI parse + validate the request
  JSON body against that schema before the function even runs; invalid
  bodies get an automatic 422 response.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.common import apply_updates, get_or_404

router = APIRouter(prefix="/job-titles", tags=["job-titles"])


@router.get("", response_model=list[schemas.JobTitleRead])
def list_job_titles(db: Session = Depends(get_db)):
    return db.query(models.JobTitle).order_by(models.JobTitle.term).all()


@router.post("", response_model=schemas.JobTitleRead, status_code=201)
def create_job_title(payload: schemas.JobTitleCreate, db: Session = Depends(get_db)):
    # Check for a duplicate ourselves so the client gets a clear 409 instead
    # of the raw UNIQUE-constraint error SQLite would raise on commit.
    existing = db.query(models.JobTitle).filter_by(term=payload.term).first()
    if existing:
        raise HTTPException(409, "A job title with this term already exists")
    row = models.JobTitle(**payload.model_dump())
    db.add(row)
    db.commit()
    # refresh() re-reads the row from the DB so server-generated values
    # (like the autoincrement id) are populated before we return it.
    db.refresh(row)
    return row


@router.patch("/{job_title_id}", response_model=schemas.JobTitleRead)
def update_job_title(
    job_title_id: int, payload: schemas.JobTitleUpdate, db: Session = Depends(get_db)
):
    row = get_or_404(db, models.JobTitle, job_title_id, "Job title")
    apply_updates(row, payload)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{job_title_id}", status_code=204)
def delete_job_title(job_title_id: int, db: Session = Depends(get_db)):
    row = get_or_404(db, models.JobTitle, job_title_id, "Job title")
    # Refuse to delete a title that a SearchConfig still points at — SQLite
    # wouldn't stop us (foreign keys aren't enforced by default), but it
    # would leave the combo referencing a missing row.
    in_use = (
        db.query(models.SearchConfig).filter_by(job_title_id=job_title_id).count() > 0
    )
    if in_use:
        raise HTTPException(
            409, "This job title is used by a search combo — remove that first"
        )
    db.delete(row)
    db.commit()
