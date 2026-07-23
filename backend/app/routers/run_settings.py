from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/run-settings", tags=["run-settings"])


@router.get("", response_model=schemas.RunSettingsRead)
def get_run_settings(db: Session = Depends(get_db)):
    row = db.get(models.RunSettings, 1)
    if row is None:
        raise HTTPException(500, "Run settings row missing — seed did not run")
    return row


@router.put("", response_model=schemas.RunSettingsRead)
def update_run_settings(
    payload: schemas.RunSettingsUpdate, db: Session = Depends(get_db)
):
    row = db.get(models.RunSettings, 1)
    if row is None:
        raise HTTPException(500, "Run settings row missing — seed did not run")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row
