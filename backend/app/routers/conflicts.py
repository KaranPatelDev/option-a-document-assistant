import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ConflictGroup, ExtractedItem
from app.schemas import ConflictOut, ConflictResolve

router = APIRouter(tags=["conflicts"])


def _to_conflict_out(group: ConflictGroup, db: Session) -> ConflictOut:
    item_ids = [
        i.id for i in db.query(ExtractedItem).filter(ExtractedItem.conflict_group_id == group.id).all()
    ]
    return ConflictOut(
        id=group.id,
        description=group.description,
        resolution_note=group.resolution_note,
        resolved_by_user=group.resolved_by_user,
        item_ids=item_ids,
    )


@router.get("/projects/{project_id}/conflicts", response_model=list[ConflictOut])
def list_conflicts(project_id: uuid.UUID, db: Session = Depends(get_db)):
    groups = db.query(ConflictGroup).filter(ConflictGroup.project_id == project_id).all()
    return [_to_conflict_out(g, db) for g in groups]


@router.patch("/conflicts/{conflict_id}", response_model=ConflictOut)
def resolve_conflict(conflict_id: uuid.UUID, payload: ConflictResolve, db: Session = Depends(get_db)):
    group = db.get(ConflictGroup, conflict_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Conflict not found")
    group.resolution_note = payload.resolution_note
    group.resolved_by_user = True
    db.add(group)
    db.commit()
    db.refresh(group)
    return _to_conflict_out(group, db)
