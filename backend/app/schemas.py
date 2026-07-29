import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models import ActionStatus, DocType, ItemStatus, ItemType


# ---- Project ----

class ProjectCreate(BaseModel):
    name: str


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---- Document ----

class DocumentCreate(BaseModel):
    filename: str
    raw_text: str


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    doc_type: DocType
    doc_type_confidence: float
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# ---- ExtractedItem ----

class ItemOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    section_ref: str
    item_type: ItemType
    content: str
    status: ItemStatus
    ai_confidence: float
    is_ai_suggestion: bool
    action_status: ActionStatus
    conflict_group_id: uuid.UUID | None
    document_filename: str | None = None

    model_config = {"from_attributes": True}


class ItemUpdate(BaseModel):
    content: str | None = None
    status: ItemStatus | None = None


class ItemActionUpdate(BaseModel):
    action_status: ActionStatus


# ---- Conflict ----

class ConflictOut(BaseModel):
    id: uuid.UUID
    description: str
    resolution_note: str | None
    resolved_by_user: bool
    item_ids: list[uuid.UUID]

    model_config = {"from_attributes": True}


class ConflictResolve(BaseModel):
    resolution_note: str


# ---- Summary ----

class SummaryCreate(BaseModel):
    item_ids: list[uuid.UUID]


class SummaryOut(BaseModel):
    id: uuid.UUID
    saved_at: datetime
    items: list[ItemOut]


# ---- LLM structured-output schemas (mirrored as plain dicts for output_config.format) ----

class ClassifyResult(BaseModel):
    doc_type: DocType
    confidence: float = Field(ge=0, le=1)


class ExtractedItemDraft(BaseModel):
    item_type: ItemType
    content: str
    section_ref: str
    status_guess: ItemStatus
    confidence: float = Field(ge=0, le=1)


class ExtractionResult(BaseModel):
    items: list[ExtractedItemDraft]


class ConflictDraft(BaseModel):
    description: str
    item_indices: list[int]  # indices into the flattened all-items list passed to the model


class ConflictDetectionResult(BaseModel):
    conflicts: list[ConflictDraft]


class SuggestionDraft(BaseModel):
    item_type: ItemType
    content: str
    rationale: str


class SuggestionResult(BaseModel):
    suggestions: list[SuggestionDraft]
