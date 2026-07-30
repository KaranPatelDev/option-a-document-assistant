import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Document, ExtractedItem, Project
from app.schemas import DocumentCreate, DocumentOut, ItemOut
from app.services.extraction import analyze_project

router = APIRouter(prefix="/projects/{project_id}", tags=["documents"])

MAX_DOCUMENTS = 3
_ALLOWED_FILENAME_RE = re.compile(r"\.(txt|md)$", re.IGNORECASE)


@router.post("/documents", response_model=DocumentOut)
def upload_document(project_id: uuid.UUID, payload: DocumentCreate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    existing_count = db.query(Document).filter(Document.project_id == project_id).count()
    if existing_count >= MAX_DOCUMENTS:
        raise HTTPException(status_code=400, detail=f"A project may have at most {MAX_DOCUMENTS} documents")

    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="Document text must not be empty")

    if not _ALLOWED_FILENAME_RE.search(payload.filename.strip()):
        raise HTTPException(status_code=400, detail="Filename must end in .txt or .md")

    doc = Document(project_id=project_id, filename=payload.filename, raw_text=payload.raw_text)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.project_id == project_id).all()


@router.post("/analyze", response_model=list[ItemOut])
def analyze(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    doc_count = db.query(Document).filter(Document.project_id == project_id).count()
    if doc_count == 0:
        raise HTTPException(status_code=400, detail="Upload at least one document before analyzing")

    items = analyze_project(project, db)
    return _items_with_filenames(items, db)


def _items_with_filenames(items: list[ExtractedItem], db: Session) -> list[dict]:
    doc_names = {d.id: d.filename for d in db.query(Document).all()}
    out = []
    for item in items:
        data = ItemOut.model_validate(item).model_dump()
        data["document_filename"] = doc_names.get(item.document_id)
        out.append(data)
    return out
