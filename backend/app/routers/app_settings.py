"""Endpoints for the AppSettings singleton — resume-tailoring config
(extracted base resume text, LLM system prompt, Ollama connection info).
Like run_settings.py this is GET/PUT on a single id=1 row, plus a file
upload endpoint that extracts plain text out of a .pdf/.docx resume."""

import io

import pdfplumber
from docx import Document
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.routers.common import apply_updates, get_settings_row

router = APIRouter(prefix="/app-settings", tags=["app-settings"])


def _extract_text(filename: str, content: bytes) -> str:
    """Pull plain text out of an uploaded resume. Only the extracted text is
    stored (it's what gets sent to the LLM) — the original file is not kept."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        # io.BytesIO wraps the in-memory bytes in a file-like object so
        # pdfplumber can read the upload without writing it to disk.
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    if lower.endswith(".docx"):
        document = Document(io.BytesIO(content))
        return "\n".join(p.text for p in document.paragraphs)
    raise HTTPException(400, "Resume must be a .pdf or .docx file")


@router.get("", response_model=schemas.AppSettingsRead)
def get_app_settings(db: Session = Depends(get_db)):
    return get_settings_row(db, models.AppSettings, "App settings")


@router.put("", response_model=schemas.AppSettingsRead)
def update_app_settings(
    payload: schemas.AppSettingsUpdate, db: Session = Depends(get_db)
):
    row = get_settings_row(db, models.AppSettings, "App settings")
    apply_updates(row, payload)
    db.commit()
    db.refresh(row)
    return row


@router.post("/resume", response_model=schemas.AppSettingsRead)
async def upload_resume(file: UploadFile, db: Session = Depends(get_db)):
    """Multipart file upload — `async def` because UploadFile.read() is an
    async operation in FastAPI (hence the `await`)."""
    row = get_settings_row(db, models.AppSettings, "App settings")

    content = await file.read()
    text = _extract_text(file.filename or "", content)
    if not text.strip():
        raise HTTPException(400, "Could not extract any text from the uploaded file")

    row.base_resume_text = text
    row.base_resume_filename = file.filename
    db.commit()
    db.refresh(row)
    return row
