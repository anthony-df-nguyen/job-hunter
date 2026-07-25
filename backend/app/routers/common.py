"""Helpers shared by all the routers.

Every router repeats the same three moves:

1. Look a row up by primary key and 404 if it doesn't exist.
2. Copy the fields the client actually sent in a PATCH body onto the row.
3. Fetch a singleton settings row (id=1) that the startup seed guarantees.

Each helper here replaces one of those copy-pasted blocks, so the endpoint
functions read as just the logic that's unique to them.
"""

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session


def get_or_404(db: Session, model, row_id: int, label: str):
    """Fetch one row by primary key, or abort the request with a 404.

    `db.get(Model, id)` is SQLAlchemy's primary-key lookup — it returns the
    ORM object or None, roughly `SELECT * FROM <table> WHERE id = ?`.
    Raising HTTPException inside an endpoint makes FastAPI stop and send
    that status/detail back to the client immediately.
    """
    row = db.get(model, row_id)
    if row is None:
        raise HTTPException(404, f"{label} not found")
    return row


def apply_updates(row, payload: BaseModel) -> None:
    """Copy the fields present in a PATCH/PUT body onto an ORM row.

    `model_dump(exclude_unset=True)` returns only the fields the client
    actually included in the request JSON — so a PATCH of `{"active": false}`
    changes just `active` and leaves every other column alone, instead of
    overwriting them with defaults/None. The caller still has to
    `db.commit()` afterward to write the change to the SQLite file.
    """
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)


def get_settings_row(db: Session, model, label: str):
    """Fetch a singleton settings row (RunSettings / AppSettings).

    These tables hold exactly one row with id=1, created by seed_all() at
    startup — so a miss means the seed never ran, which is a server-side
    problem (500), not a bad request from the client.
    """
    row = db.get(model, 1)
    if row is None:
        raise HTTPException(500, f"{label} row missing — seed did not run")
    return row
