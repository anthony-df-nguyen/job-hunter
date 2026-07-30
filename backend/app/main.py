"""FastAPI application entry point — run with `uvicorn app.main:app`.

Wires everything together: creates/updates the SQLite schema at startup,
seeds default data, mounts every router, and allows the Next.js dev server
(localhost:3000) to call this API cross-origin.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import DB_PATH, Base, SessionLocal, engine
from app.routers import (
    app_settings,
    job_statuses,
    job_titles,
    jobs,
    keyword_rules,
    locations,
    run_settings,
    runs,
    search_configs,
)
from app.seed import seed_all

# The schema version the models in models.py describe. The version of an
# existing database file lives in SQLite's built-in `PRAGMA user_version`
# (an integer in the file header, 0 on a brand-new file).
SCHEMA_VERSION = 1

# Upgrade steps for databases created at an older SCHEMA_VERSION:
# MIGRATIONS[n] lists the SQL statements that take a version-n database to
# version n + 1. To change the schema: edit models.py (covers fresh
# databases via create_all), append the matching ALTER/UPDATE statements
# here (covers existing databases), and bump SCHEMA_VERSION.
MIGRATIONS: dict[int, list[str]] = {}


def _init_schema():
    """Create or upgrade the database schema.

    Fresh databases get the full current schema from `create_all()` and are
    stamped with SCHEMA_VERSION directly. Existing databases run each
    pending MIGRATIONS step in order, stamping the new version after each
    step so an interrupted upgrade resumes where it left off.
    """
    with engine.connect() as conn:
        existing_tables = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type = 'table'")
        ).all()
    fresh = not existing_tables

    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        if fresh:
            conn.execute(text(f"PRAGMA user_version = {SCHEMA_VERSION}"))
            conn.commit()
            return

        version = conn.execute(text("PRAGMA user_version")).scalar()
        if version > SCHEMA_VERSION:
            raise RuntimeError(
                f"Database is at schema version {version} but this build only "
                f"knows version {SCHEMA_VERSION} — it was created by a newer "
                "version of the app. Update the app, or delete the database "
                f"file to start fresh: {DB_PATH}"
            )
        while version < SCHEMA_VERSION:
            if version not in MIGRATIONS:
                raise RuntimeError(
                    f"Database is at schema version {version} with no upgrade "
                    "path (it likely predates schema versioning). Delete the "
                    f"database file to start fresh: {DB_PATH}"
                )
            for statement in MIGRATIONS[version]:
                conn.execute(text(statement))
            version += 1
            conn.execute(text(f"PRAGMA user_version = {version}"))
            conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup hook: code before `yield` runs once when the server boots
    (create/upgrade schema → seed defaults), code after would run on
    shutdown (we don't need any)."""
    _init_schema()
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Job Hunter", lifespan=lifespan)

# Browsers block cross-origin requests by default; this tells them the
# frontend dev server (a different port = different origin) may call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(job_titles.router)
app.include_router(locations.router)
app.include_router(search_configs.router)
app.include_router(keyword_rules.router)
app.include_router(job_statuses.router)
app.include_router(run_settings.router)
app.include_router(app_settings.router)
app.include_router(runs.router)
app.include_router(jobs.router)


@app.get("/health")
def health():
    return {"status": "ok"}
