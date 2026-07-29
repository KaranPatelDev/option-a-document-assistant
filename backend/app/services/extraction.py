"""Core AI workflow: classify -> extract -> detect conflicts -> suggest missing items.

INVARIANT (enforced here, not just prompted for): nothing in this module ever sets
action_status to APPROVED, REJECTED, or EDITED. New action items are always created
as PROPOSED (or, for AI-suggested-but-not-extracted items, NONE + is_ai_suggestion).
Only the human-review API endpoints (routers/items.py) may transition those states.
"""

import logging

from sqlalchemy.orm import Session

from app.models import (
    ActionStatus,
    ConflictGroup,
    Document,
    ExtractedItem,
    ItemStatus,
    ItemType,
    Project,
)
from app.schemas import (
    ClassifyResult,
    ConflictDetectionResult,
    ExtractionResult,
    SuggestionResult,
)
from app.services import knowledge_base
from app.services.llm import call_structured

logger = logging.getLogger("app.extraction")

CLASSIFY_SYSTEM = (
    "You classify a single project document into exactly one of: meeting_notes, "
    "requirement_draft, implementation_notes, project_update, decision_record, unknown. "
    "Base the classification only on the document's content and structure."
)

EXTRACT_SYSTEM = (
    "You extract structured items from a single project document. For every item, decide "
    "an item_type (fact, decision, assumption, risk, open_question, action_item), the exact "
    "content, a section_ref describing where in the document it appears (e.g. a heading, "
    "paragraph number, or speaker name — whatever the document exposes), a status_guess "
    "(confirmed = explicitly stated as true/decided; assumption = stated as believed but not "
    "verified; unresolved = stated as an open item), and a confidence score. "
    "Only extract what the document actually states — do not infer facts the document does "
    "not contain. Distinguish confirmed statements from the document's own hedging or "
    "interpretation; when the document itself is speculative, mark it assumption or unresolved, "
    "never confirmed."
)

CONFLICT_SYSTEM = (
    "You are given a numbered list of extracted items (possibly from different source "
    "documents in the same project). Identify groups of items that repeat the same "
    "statement or directly conflict with each other (e.g. two different owners assigned "
    "to the same decision, or contradictory statements about the same fact). For each "
    "group, write a short plain-language description of the conflict and list the item "
    "indices involved (at least 2 indices per group). Only report genuine repeats or "
    "contradictions — do not report merely related items."
)

SUGGEST_SYSTEM = (
    "You are given the full set of extracted items for a project. Suggest open questions "
    "or action items the source documents seem to be missing, given standard project "
    "management practice (e.g. a risk with no mitigation owner, a decision with no "
    "effective date, an assumption never revisited). For each suggestion, give a short "
    "rationale referencing what's missing. These are suggestions only — do not claim they "
    "are already confirmed by the documents."
)


def classify_document(document: Document) -> ClassifyResult:
    result = call_structured(
        system=CLASSIFY_SYSTEM,
        user_content=document.raw_text,
        schema_model=ClassifyResult,
    )
    return result  # type: ignore[return-value]


def extract_items(document: Document) -> ExtractionResult:
    result = call_structured(
        system=EXTRACT_SYSTEM,
        user_content=document.raw_text,
        schema_model=ExtractionResult,
        max_tokens=8192,
    )
    return result  # type: ignore[return-value]


def _flatten_items_prompt(items: list[ExtractedItem]) -> str:
    lines = []
    for idx, item in enumerate(items):
        lines.append(f"[{idx}] ({item.item_type.value}, doc={item.document_id}) {item.content}")
    return "\n".join(lines)


def detect_conflicts(project_id, items: list[ExtractedItem], db: Session) -> None:
    if len(items) < 2:
        return
    result: ConflictDetectionResult = call_structured(  # type: ignore[assignment]
        system=CONFLICT_SYSTEM,
        user_content=_flatten_items_prompt(items),
        schema_model=ConflictDetectionResult,
        max_tokens=4096,
    )
    for draft in result.conflicts:
        valid_indices = [i for i in draft.item_indices if 0 <= i < len(items)]
        if len(valid_indices) < 2:
            continue
        group = ConflictGroup(project_id=project_id, description=draft.description)
        db.add(group)
        db.flush()
        for i in valid_indices:
            items[i].conflict_group_id = group.id
    db.commit()


def suggest_missing_items(project_id, items: list[ExtractedItem], db: Session) -> list[ExtractedItem]:
    """Creates rows for AI-suggested items. Marked is_ai_suggestion=True and never given an
    action_status beyond NONE — the user must explicitly promote a suggestion into a real item."""
    if not items:
        return []
    result: SuggestionResult = call_structured(  # type: ignore[assignment]
        system=SUGGEST_SYSTEM,
        user_content=_flatten_items_prompt(items),
        schema_model=SuggestionResult,
        max_tokens=4096,
    )
    created: list[ExtractedItem] = []
    # AI suggestions have no single source document; anchor them to the first document
    # in the project purely so the FK is satisfiable, and label them clearly in the UI.
    anchor_document_id = items[0].document_id
    for s in result.suggestions:
        row = ExtractedItem(
            project_id=project_id,
            document_id=anchor_document_id,
            section_ref="AI suggestion (not sourced from a document)",
            item_type=s.item_type,
            content=f"{s.content} — {s.rationale}",
            status=ItemStatus.unresolved,
            ai_confidence=0.0,
            is_ai_suggestion=True,
            action_status=ActionStatus.none,
        )
        db.add(row)
        created.append(row)
    db.commit()
    return created


def analyze_project(project: Project, db: Session) -> list[ExtractedItem]:
    """Runs the full pipeline for every document in the project. Idempotent per call:
    clears prior extraction results for this project before regenerating, so re-running
    Analyze after adding a document doesn't duplicate items."""
    knowledge_base.seed_standards(db)

    db.query(ExtractedItem).filter(ExtractedItem.project_id == project.id).delete()
    db.query(ConflictGroup).filter(ConflictGroup.project_id == project.id).delete()
    db.commit()

    documents = db.query(Document).filter(Document.project_id == project.id).all()
    all_items: list[ExtractedItem] = []

    for doc in documents:
        classification = classify_document(doc)
        doc.doc_type = classification.doc_type
        doc.doc_type_confidence = classification.confidence
        db.add(doc)

        extraction = extract_items(doc)
        for draft in extraction.items:
            action_status = ActionStatus.proposed if draft.item_type == ItemType.action_item else ActionStatus.none
            row = ExtractedItem(
                project_id=project.id,
                document_id=doc.id,
                section_ref=draft.section_ref,
                item_type=draft.item_type,
                content=draft.content,
                status=draft.status_guess,
                ai_confidence=draft.confidence,
                is_ai_suggestion=False,
                action_status=action_status,
            )
            db.add(row)
            all_items.append(row)
    db.commit()
    for row in all_items:
        db.refresh(row)

    detect_conflicts(project.id, all_items, db)
    suggest_missing_items(project.id, all_items, db)

    logger.info(
        "analyze_complete",
        extra={"project_id": str(project.id), "documents": len(documents), "items": len(all_items)},
    )

    return db.query(ExtractedItem).filter(ExtractedItem.project_id == project.id).all()
