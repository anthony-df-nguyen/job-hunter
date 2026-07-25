"""CRUD endpoints for keyword rules — the filter lists (good title /
skip title / skip description / contract type) applied to scraped jobs.
All four lists live in one table; `category` says which list a keyword
belongs to. See job_titles.py for the shared FastAPI plumbing notes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.models import KEYWORD_CATEGORIES
from app.routers.common import apply_updates, get_or_404

router = APIRouter(prefix="/keyword-rules", tags=["keyword-rules"])


def _validate_category(category: str) -> None:
    """Category is stored as a plain string column (not a DB enum), so the
    API layer is what keeps bad values out of the table."""
    if category not in KEYWORD_CATEGORIES:
        raise HTTPException(422, f"category must be one of {KEYWORD_CATEGORIES}")


@router.get("", response_model=list[schemas.KeywordRuleRead])
def list_keyword_rules(
    category: str | None = Query(default=None), db: Session = Depends(get_db)
):
    q = db.query(models.KeywordRule)
    if category is not None:
        _validate_category(category)
        q = q.filter_by(category=category)
    return q.order_by(models.KeywordRule.category, models.KeywordRule.keyword).all()


@router.post("", response_model=schemas.KeywordRuleRead, status_code=201)
def create_keyword_rule(
    payload: schemas.KeywordRuleCreate, db: Session = Depends(get_db)
):
    _validate_category(payload.category)
    row = models.KeywordRule(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{rule_id}", response_model=schemas.KeywordRuleRead)
def update_keyword_rule(
    rule_id: int, payload: schemas.KeywordRuleUpdate, db: Session = Depends(get_db)
):
    row = get_or_404(db, models.KeywordRule, rule_id, "Keyword rule")
    apply_updates(row, payload)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{rule_id}", status_code=204)
def delete_keyword_rule(rule_id: int, db: Session = Depends(get_db)):
    row = get_or_404(db, models.KeywordRule, rule_id, "Keyword rule")
    db.delete(row)
    db.commit()
