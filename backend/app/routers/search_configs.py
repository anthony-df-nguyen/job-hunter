from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/search-configs", tags=["search-configs"])


def _query(db: Session):
    return db.query(models.SearchConfig).options(
        joinedload(models.SearchConfig.job_title),
        joinedload(models.SearchConfig.location),
    )


@router.get("", response_model=list[schemas.SearchConfigRead])
def list_search_configs(db: Session = Depends(get_db)):
    return _query(db).order_by(models.SearchConfig.id).all()


@router.post("", response_model=schemas.SearchConfigRead, status_code=201)
def create_search_config(
    payload: schemas.SearchConfigCreate, db: Session = Depends(get_db)
):
    if db.get(models.JobTitle, payload.job_title_id) is None:
        raise HTTPException(422, "job_title_id does not exist")
    if db.get(models.Location, payload.location_id) is None:
        raise HTTPException(422, "location_id does not exist")

    row = models.SearchConfig(**payload.model_dump())
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This exact title/location/remote combo already exists")
    db.refresh(row)
    return _query(db).filter_by(id=row.id).first()


@router.patch("/{search_config_id}", response_model=schemas.SearchConfigRead)
def update_search_config(
    search_config_id: int,
    payload: schemas.SearchConfigUpdate,
    db: Session = Depends(get_db),
):
    row = db.get(models.SearchConfig, search_config_id)
    if row is None:
        raise HTTPException(404, "Search combo not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This exact title/location/remote combo already exists")
    db.refresh(row)
    return _query(db).filter_by(id=row.id).first()


@router.delete("/{search_config_id}", status_code=204)
def delete_search_config(search_config_id: int, db: Session = Depends(get_db)):
    row = db.get(models.SearchConfig, search_config_id)
    if row is None:
        raise HTTPException(404, "Search combo not found")
    db.delete(row)
    db.commit()
