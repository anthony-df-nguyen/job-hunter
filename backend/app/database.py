"""Database setup — the glue between SQLAlchemy (the Python ORM) and the
SQLite file on disk.

SQLite in one paragraph: it's not a database *server* like Postgres or
MySQL — the entire database is a single ordinary file (jobhunter.db, kept
next to this module), and the sqlite3 library reads/writes it directly
inside this process. Nothing to install or start; delete the file and you
have a fresh empty database on next launch (the seed will repopulate
defaults).

SQLAlchemy layers on top of that:

- `engine`  — owns the connection(s) to the database file.
- `Session` — a unit of work: you query/modify ORM objects through it, and
  nothing touches the file until `commit()` (or is undone by `rollback()`).
- `Base`    — the class our models inherit from; each subclass in models.py
  describes one table, and `Base.metadata.create_all()` (called at startup
  in main.py) issues CREATE TABLE for any table that doesn't exist yet.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Store the DB file next to this module (backend/app/jobhunter.db) rather
# than relative to wherever uvicorn was launched from.
_APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_APP_DIR, "jobhunter.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# check_same_thread=False: by default the sqlite3 driver refuses to use a
# connection from a thread other than the one that created it. FastAPI runs
# sync endpoints (and background tasks) on a threadpool, so that guard has
# to be off. It's still safe because each request/task gets its own session,
# never sharing one across threads.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Factory for sessions. autocommit=False means changes only persist when we
# explicitly call db.commit(); autoflush=False means SQLAlchemy won't send
# pending changes to the DB mid-query behind our backs.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Parent class for every table model in models.py."""


def get_db():
    """FastAPI dependency: open a session for one request, always close it.

    This is a generator — FastAPI runs the code before `yield` when a
    request comes in, hands the session to the endpoint, and runs the
    `finally` block after the response is sent. Endpoints receive it via
    `db: Session = Depends(get_db)`.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
