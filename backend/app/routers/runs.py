from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.scraper import run_scrape

router = APIRouter(prefix="/runs", tags=["runs"])


@router.post("", response_model=schemas.RunRead, status_code=201)
def start_run(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    already_running = (
        db.query(models.Run).filter_by(status="running").first() is not None
    )
    if already_running:
        raise HTTPException(409, "A run is already in progress")

    run = models.Run(status="running", started_at=datetime.utcnow())
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(run_scrape, run.id)
    return run


@router.get("/{run_id}", response_model=schemas.RunRead)
def get_run(run_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Run, run_id)
    if row is None:
        raise HTTPException(404, "Run not found")
    return row


@router.post("/{run_id}/cancel", response_model=schemas.RunRead)
def cancel_run(run_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Run, run_id)
    if row is None:
        raise HTTPException(404, "Run not found")
    if row.status != "running":
        raise HTTPException(409, "Run is not in progress")
    row.cancel_requested = True
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=list[schemas.RunRead])
def list_runs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.Run).order_by(models.Run.started_at.desc()).limit(limit).all()
