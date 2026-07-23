from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/jobs", tags=["jobs"])

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
    q = db.query(models.Job).options(joinedload(models.Job.status))

    if status_id is not None:
        q = q.filter(models.Job.status_id == status_id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.Job.title.ilike(like)) | (models.Job.company.ilike(like))
        )

    sort_column = _SORTABLE_COLUMNS.get(sort, models.Job.date_seen)
    q = q.order_by(sort_column.desc() if descending else sort_column.asc())

    return q.offset(offset).limit(limit).all()


@router.delete("", status_code=204)
def delete_all_jobs(db: Session = Depends(get_db)):
    db.query(models.Job).delete()
    db.commit()


@router.patch("/{job_id}", response_model=schemas.JobRead)
def update_job(job_id: int, payload: schemas.JobUpdate, db: Session = Depends(get_db)):
    row = db.get(models.Job, job_id)
    if row is None:
        raise HTTPException(404, "Job not found")
    if payload.status_id is not None and db.get(models.JobStatus, payload.status_id) is None:
        raise HTTPException(422, "status_id does not exist")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Job, job_id)
    if row is None:
        raise HTTPException(404, "Job not found")
    db.delete(row)
    db.commit()
