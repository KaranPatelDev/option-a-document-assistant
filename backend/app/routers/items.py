import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ActionStatus, Document, ExtractedItem
from app.schemas import ItemActionUpdate, ItemOut, ItemUpdate

router = APIRouter(tags=["items"])


def _to_item_out(item: ExtractedItem, db: Session) -> ItemOut:
    document = db.get(Document, item.document_id)
    data = ItemOut.model_validate(item).model_dump()
    data["document_filename"] = document.filename if document else None
    return ItemOut.model_validate(data)


@router.get("/projects/{project_id}/items", response_model=list[ItemOut])
def list_items(project_id: uuid.UUID, db: Session = Depends(get_db)):
    items = db.query(ExtractedItem).filter(ExtractedItem.project_id == project_id).all()
    return [_to_item_out(item, db) for item in items]


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(item_id: uuid.UUID, payload: ItemUpdate, db: Session = Depends(get_db)):
    """Lets a human correct extracted content or re-classify status
    (confirmed / assumption / unresolved)."""
    item = db.get(ExtractedItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if payload.content is not None:
        item.content = payload.content
    if payload.status is not None:
        item.status = payload.status
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_item_out(item, db)


@router.patch("/items/{item_id}/action", response_model=ItemOut)
def update_item_action(item_id: uuid.UUID, payload: ItemActionUpdate, db: Session = Depends(get_db)):
    """The ONLY place an action item's status can move to approved/rejected/edited.
    This is a human-triggered API call, never invoked by the AI service layer —
    satisfies "the AI must not create or assign tasks automatically"."""
    item = db.get(ExtractedItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if payload.action_status not in (ActionStatus.approved, ActionStatus.rejected, ActionStatus.edited, ActionStatus.proposed):
        raise HTTPException(status_code=400, detail="Invalid action status")
    item.action_status = payload.action_status
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_item_out(item, db)
