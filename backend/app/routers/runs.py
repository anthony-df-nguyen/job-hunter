"""Endpoints for scrape runs: start one, poll its progress, cancel it,
and list history. The actual scraping happens in app/scraper.py — this
router just creates/reads the Run rows that track it."""

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.common import get_or_404
from app.scraper import run_scrape

router = APIRouter(prefix="/runs", tags=["runs"])


@router.post("", response_model=schemas.RunRead, status_code=201)
def start_run(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Create a Run row and kick off the scrape in the background.

    BackgroundTasks runs run_scrape() after this response is sent, so the
    frontend gets the new run's id immediately and polls GET /runs/{id}
    for progress instead of waiting minutes for the scrape to finish.
    """
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
    """Polled by the frontend's progress banner while a run is in flight."""
    return get_or_404(db, models.Run, run_id, "Run")


@router.post("/{run_id}/cancel", response_model=schemas.RunRead)
def cancel_run(run_id: int, db: Session = Depends(get_db)):
    """Cancellation is cooperative: this just sets a flag on the row, and
    the scrape loop checks it between searches (see scraper.run_scrape)."""
    row = get_or_404(db, models.Run, run_id, "Run")
    if row.status != "running":
        raise HTTPException(409, "Run is not in progress")
    row.cancel_requested = True
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=list[schemas.RunRead])
def list_runs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.Run).order_by(models.Run.started_at.desc()).limit(limit).all()
