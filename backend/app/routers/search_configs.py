"""CRUD endpoints for search configs — the (title, location, remote)
combos the scraper actually runs. See job_titles.py for the shared
FastAPI plumbing notes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.routers.common import apply_updates, get_or_404

router = APIRouter(prefix="/search-configs", tags=["search-configs"])


def _query(db: Session):
    """Base query with joinedload(), which fetches the related JobTitle and
    Location rows in the same SQL query (a JOIN) instead of lazily issuing
    one extra query per config when the response is serialized."""
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
    # Validate the foreign keys up front — SQLite doesn't enforce them by
    # default, so a bad id would otherwise be stored silently.
    if db.get(models.JobTitle, payload.job_title_id) is None:
        raise HTTPException(422, "job_title_id does not exist")
    if db.get(models.Location, payload.location_id) is None:
        raise HTTPException(422, "location_id does not exist")

    row = models.SearchConfig(**payload.model_dump())
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        # The uq_search_combo UNIQUE constraint fired: this exact
        # title+location+remote combo already exists. rollback() is required
        # after a failed commit before the session can be used again.
        db.rollback()
        raise HTTPException(409, "This exact title/location/remote combo already exists")
    db.refresh(row)
    # Re-fetch through _query so job_title/location are eagerly loaded for
    # the response schema.
    return _query(db).filter_by(id=row.id).first()


@router.patch("/{search_config_id}", response_model=schemas.SearchConfigRead)
def update_search_config(
    search_config_id: int,
    payload: schemas.SearchConfigUpdate,
    db: Session = Depends(get_db),
):
    row = get_or_404(db, models.SearchConfig, search_config_id, "Search combo")
    apply_updates(row, payload)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "This exact title/location/remote combo already exists")
    db.refresh(row)
    return _query(db).filter_by(id=row.id).first()


@router.delete("/{search_config_id}", status_code=204)
def delete_search_config(search_config_id: int, db: Session = Depends(get_db)):
    row = get_or_404(db, models.SearchConfig, search_config_id, "Search combo")
    db.delete(row)
    db.commit()
