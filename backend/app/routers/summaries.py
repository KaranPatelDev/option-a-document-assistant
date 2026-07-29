import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ActionSummary, Document, ExtractedItem, Project
from app.schemas import ItemOut, SummaryCreate, SummaryOut

router = APIRouter(tags=["summaries"])


@router.post("/projects/{project_id}/summary", response_model=SummaryOut)
def save_summary(project_id: uuid.UUID, payload: SummaryCreate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not payload.item_ids:
        raise HTTPException(status_code=400, detail="Select at least one item to save into the summary")

    summary = ActionSummary(project_id=project_id, item_ids=[str(i) for i in payload.item_ids])
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return _to_summary_out(summary, db)


@router.get("/summaries/{summary_id}", response_model=SummaryOut)
def get_summary(summary_id: uuid.UUID, db: Session = Depends(get_db)):
    summary = db.get(ActionSummary, summary_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Summary not found")
    return _to_summary_out(summary, db)


def _to_summary_out(summary: ActionSummary, db: Session) -> SummaryOut:
    item_ids = [uuid.UUID(i) for i in summary.item_ids]
    items = db.query(ExtractedItem).filter(ExtractedItem.id.in_(item_ids)).all()
    doc_names = {d.id: d.filename for d in db.query(Document).all()}
    item_outs = []
    for item in items:
        data = ItemOut.model_validate(item).model_dump()
        data["document_filename"] = doc_names.get(item.document_id)
        item_outs.append(ItemOut.model_validate(data))
    return SummaryOut(id=summary.id, saved_at=summary.saved_at, items=item_outs)
