from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.models import KEYWORD_CATEGORIES

router = APIRouter(prefix="/keyword-rules", tags=["keyword-rules"])


@router.get("", response_model=list[schemas.KeywordRuleRead])
def list_keyword_rules(
    category: str | None = Query(default=None), db: Session = Depends(get_db)
):
    q = db.query(models.KeywordRule)
    if category is not None:
        if category not in KEYWORD_CATEGORIES:
            raise HTTPException(422, f"category must be one of {KEYWORD_CATEGORIES}")
        q = q.filter_by(category=category)
    return q.order_by(models.KeywordRule.category, models.KeywordRule.keyword).all()


@router.post("", response_model=schemas.KeywordRuleRead, status_code=201)
def create_keyword_rule(
    payload: schemas.KeywordRuleCreate, db: Session = Depends(get_db)
):
    if payload.category not in KEYWORD_CATEGORIES:
        raise HTTPException(422, f"category must be one of {KEYWORD_CATEGORIES}")
    row = models.KeywordRule(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{rule_id}", response_model=schemas.KeywordRuleRead)
def update_keyword_rule(
    rule_id: int, payload: schemas.KeywordRuleUpdate, db: Session = Depends(get_db)
):
    row = db.get(models.KeywordRule, rule_id)
    if row is None:
        raise HTTPException(404, "Keyword rule not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{rule_id}", status_code=204)
def delete_keyword_rule(rule_id: int, db: Session = Depends(get_db)):
    row = db.get(models.KeywordRule, rule_id)
    if row is None:
        raise HTTPException(404, "Keyword rule not found")
    db.delete(row)
    db.commit()
