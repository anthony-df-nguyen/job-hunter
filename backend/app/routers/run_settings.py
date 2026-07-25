"""Endpoints for the RunSettings singleton — the global scrape knobs
(sites, results per search, hours old, salary floor). There's exactly one
row (id=1, created by the startup seed), so this is GET/PUT with no id in
the URL rather than full CRUD."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.common import apply_updates, get_settings_row

router = APIRouter(prefix="/run-settings", tags=["run-settings"])


@router.get("", response_model=schemas.RunSettingsRead)
def get_run_settings(db: Session = Depends(get_db)):
    return get_settings_row(db, models.RunSettings, "Run settings")


@router.put("", response_model=schemas.RunSettingsRead)
def update_run_settings(
    payload: schemas.RunSettingsUpdate, db: Session = Depends(get_db)
):
    row = get_settings_row(db, models.RunSettings, "Run settings")
    apply_updates(row, payload)
    db.commit()
    db.refresh(row)
    return row
