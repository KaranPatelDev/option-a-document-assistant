import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.db_types import GUID, StringList


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DocType(str, enum.Enum):
    meeting_notes = "meeting_notes"
    requirement_draft = "requirement_draft"
    implementation_notes = "implementation_notes"
    project_update = "project_update"
    decision_record = "decision_record"
    unknown = "unknown"


class ItemType(str, enum.Enum):
    fact = "fact"
    decision = "decision"
    assumption = "assumption"
    risk = "risk"
    open_question = "open_question"
    action_item = "action_item"


class ItemStatus(str, enum.Enum):
    confirmed = "confirmed"
    assumption = "assumption"
    unresolved = "unresolved"


class ActionStatus(str, enum.Enum):
    none = "none"
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"
    edited = "edited"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    documents: Mapped[list["Document"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    items: Mapped[list["ExtractedItem"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    conflicts: Mapped[list["ConflictGroup"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    summaries: Mapped[list["ActionSummary"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("projects.id"))
    filename: Mapped[str] = mapped_column(String(255))
    doc_type: Mapped[DocType] = mapped_column(Enum(DocType), default=DocType.unknown)
    doc_type_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    raw_text: Mapped[str] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    project: Mapped[Project] = relationship(back_populates="documents")
    items: Mapped[list["ExtractedItem"]] = relationship(back_populates="document", cascade="all, delete-orphan")


class ConflictGroup(Base):
    __tablename__ = "conflict_groups"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("projects.id"))
    description: Mapped[str] = mapped_column(Text)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_user: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped[Project] = relationship(back_populates="conflicts")
    items: Mapped[list["ExtractedItem"]] = relationship(back_populates="conflict_group")


class ExtractedItem(Base):
    __tablename__ = "extracted_items"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("projects.id"))
    document_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("documents.id"))
    section_ref: Mapped[str] = mapped_column(String(500), default="")
    item_type: Mapped[ItemType] = mapped_column(Enum(ItemType))
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[ItemStatus] = mapped_column(Enum(ItemStatus), default=ItemStatus.unresolved)
    ai_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    is_ai_suggestion: Mapped[bool] = mapped_column(Boolean, default=False)
    action_status: Mapped[ActionStatus] = mapped_column(Enum(ActionStatus), default=ActionStatus.none)
    conflict_group_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), ForeignKey("conflict_groups.id"), nullable=True)
    related_standards: Mapped[list[str]] = mapped_column(StringList(), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    project: Mapped[Project] = relationship(back_populates="items")
    document: Mapped[Document] = relationship(back_populates="items")
    conflict_group: Mapped[ConflictGroup | None] = relationship(back_populates="items")


class StandardsDoc(Base):
    __tablename__ = "standards_docs"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str]] = mapped_column(StringList(), default=list)


class ActionSummary(Base):
    __tablename__ = "action_summaries"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("projects.id"))
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    item_ids: Mapped[list[str]] = mapped_column(StringList(), default=list)

    project: Mapped[Project] = relationship(back_populates="summaries")
