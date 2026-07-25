"""FastAPI application entry point — run with `uvicorn app.main:app`.

Wires everything together: creates/updates the SQLite schema at startup,
seeds default data, mounts every router, and allows the Next.js dev server
(localhost:3000) to call this API cross-origin.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, SessionLocal, engine
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
from app.seed import DEFAULT_JOB_STATUSES, seed_all


def _run_migrations():
    """No migration framework (Alembic) is set up yet — `create_all` only
    creates missing tables, not missing columns on existing ones, so columns
    added after the initial schema need a manual ALTER TABLE here."""
    with engine.connect() as conn:
        columns = {row[1] for row in conn.execute(text("PRAGMA table_info(jobs)"))}
        if "description" not in columns:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN description TEXT"))
            conn.commit()

        status_columns = {
            row[1] for row in conn.execute(text("PRAGMA table_info(job_statuses)"))
        }
        if "color" not in status_columns:
            conn.execute(
                text("ALTER TABLE job_statuses ADD COLUMN color TEXT DEFAULT '#71717a'")
            )
            for name, _is_default, color in DEFAULT_JOB_STATUSES:
                conn.execute(
                    text(
                        "UPDATE job_statuses SET color = :color WHERE name = :name"
                    ),
                    {"color": color, "name": name},
                )
            conn.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup hook: code before `yield` runs once when the server boots
    (create tables → patch schema → seed defaults), code after would run
    on shutdown (we don't need any)."""
    Base.metadata.create_all(bind=engine)
    _run_migrations()
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
