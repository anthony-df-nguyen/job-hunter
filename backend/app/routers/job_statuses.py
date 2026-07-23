from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/statuses", tags=["statuses"])


def _clear_other_defaults(db: Session, keep_id: int | None) -> None:
    """Only one JobStatus may have is_default=True at a time."""
    q = db.query(models.JobStatus).filter(models.JobStatus.is_default.is_(True))
    if keep_id is not None:
        q = q.filter(models.JobStatus.id != keep_id)
    for row in q.all():
        row.is_default = False


@router.get("", response_model=list[schemas.JobStatusRead])
def list_statuses(db: Session = Depends(get_db)):
    return db.query(models.JobStatus).order_by(models.JobStatus.sort_order).all()


@router.post("", response_model=schemas.JobStatusRead, status_code=201)
def create_status(payload: schemas.JobStatusCreate, db: Session = Depends(get_db)):
    existing = db.query(models.JobStatus).filter_by(name=payload.name).first()
    if existing:
        raise HTTPException(409, "A status with this name already exists")
    row = models.JobStatus(**payload.model_dump())
    db.add(row)
    db.flush()
    if row.is_default:
        _clear_other_defaults(db, keep_id=row.id)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{status_id}", response_model=schemas.JobStatusRead)
def update_status(
    status_id: int, payload: schemas.JobStatusUpdate, db: Session = Depends(get_db)
):
    row = db.get(models.JobStatus, status_id)
    if row is None:
        raise HTTPException(404, "Status not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    if row.is_default:
        _clear_other_defaults(db, keep_id=row.id)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{status_id}", status_code=204)
def delete_status(status_id: int, db: Session = Depends(get_db)):
    row = db.get(models.JobStatus, status_id)
    if row is None:
        raise HTTPException(404, "Status not found")
    in_use = db.query(models.Job).filter_by(status_id=status_id).count() > 0
    if in_use:
        raise HTTPException(
            409, "This status is still assigned to jobs — reassign them first"
        )
    db.delete(row)
    db.commit()
