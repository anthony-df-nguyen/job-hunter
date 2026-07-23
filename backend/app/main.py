from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.routers import (
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Job Hunter", lifespan=lifespan)

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
app.include_router(runs.router)
app.include_router(jobs.router)


@app.get("/health")
def health():
    return {"status": "ok"}
