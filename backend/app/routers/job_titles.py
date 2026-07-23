from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/job-titles", tags=["job-titles"])


@router.get("", response_model=list[schemas.JobTitleRead])
def list_job_titles(db: Session = Depends(get_db)):
    return db.query(models.JobTitle).order_by(models.JobTitle.term).all()


@router.post("", response_model=schemas.JobTitleRead, status_code=201)
def create_job_title(payload: schemas.JobTitleCreate, db: Session = Depends(get_db)):
    existing = db.query(models.JobTitle).filter_by(term=payload.term).first()
    if existing:
        raise HTTPException(409, "A job title with this term already exists")
    row = models.JobTitle(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{job_title_id}", response_model=schemas.JobTitleRead)
def update_job_title(
    job_title_id: int, payload: schemas.JobTitleUpdate, db: Session = Depends(get_db)
):
    row = db.get(models.JobTitle, job_title_id)
    if row is None:
        raise HTTPException(404, "Job title not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{job_title_id}", status_code=204)
def delete_job_title(job_title_id: int, db: Session = Depends(get_db)):
    row = db.get(models.JobTitle, job_title_id)
    if row is None:
        raise HTTPException(404, "Job title not found")
    in_use = (
        db.query(models.SearchConfig).filter_by(job_title_id=job_title_id).count() > 0
    )
    if in_use:
        raise HTTPException(
            409, "This job title is used by a search combo — remove that first"
        )
    db.delete(row)
    db.commit()
