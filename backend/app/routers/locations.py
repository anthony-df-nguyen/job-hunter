from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[schemas.LocationRead])
def list_locations(db: Session = Depends(get_db)):
    return db.query(models.Location).order_by(models.Location.name).all()


@router.post("", response_model=schemas.LocationRead, status_code=201)
def create_location(payload: schemas.LocationCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Location).filter_by(name=payload.name).first()
    if existing:
        raise HTTPException(409, "A location with this name already exists")
    row = models.Location(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{location_id}", response_model=schemas.LocationRead)
def update_location(
    location_id: int, payload: schemas.LocationUpdate, db: Session = Depends(get_db)
):
    row = db.get(models.Location, location_id)
    if row is None:
        raise HTTPException(404, "Location not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{location_id}", status_code=204)
def delete_location(location_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Location, location_id)
    if row is None:
        raise HTTPException(404, "Location not found")
    in_use = (
        db.query(models.SearchConfig).filter_by(location_id=location_id).count() > 0
    )
    if in_use:
        raise HTTPException(
            409, "This location is used by a search combo — remove that first"
        )
    db.delete(row)
    db.commit()
