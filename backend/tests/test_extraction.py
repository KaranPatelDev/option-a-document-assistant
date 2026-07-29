from app.models import ActionStatus, Document, ExtractedItem, ItemStatus, ItemType, Project
from app.schemas import (
    ClassifyResult,
    ConflictDetectionResult,
    ConflictDraft,
    ExtractedItemDraft,
    ExtractionResult,
    SuggestionDraft,
    SuggestionResult,
)
from app.services import extraction


def _fake_call_structured(*, system, user_content, schema_model, max_tokens=4096):
    if schema_model is ClassifyResult:
        return ClassifyResult(doc_type="decision_record", confidence=0.9)
    if schema_model is ExtractionResult:
        return ExtractionResult(
            items=[
                ExtractedItemDraft(
                    item_type=ItemType.decision,
                    content="We will use Postgres for the database.",
                    section_ref="Paragraph 1",
                    status_guess=ItemStatus.confirmed,
                    confidence=0.95,
                ),
                ExtractedItemDraft(
                    item_type=ItemType.action_item,
                    content="Set up the staging database.",
                    section_ref="Paragraph 2",
                    status_guess=ItemStatus.unresolved,
                    confidence=0.8,
                ),
            ]
        )
    if schema_model is ConflictDetectionResult:
        return ConflictDetectionResult(
            conflicts=[ConflictDraft(description="Two conflicting owners assigned", item_indices=[0, 1])]
        )
    if schema_model is SuggestionResult:
        return SuggestionResult(
            suggestions=[
                SuggestionDraft(
                    item_type=ItemType.open_question,
                    content="Who owns the staging database mitigation?",
                    rationale="No owner was named for this action item.",
                )
            ]
        )
    raise AssertionError(f"Unexpected schema_model: {schema_model}")


def test_analyze_project_extracts_classifies_and_flags_conflicts(db_session, monkeypatch):
    monkeypatch.setattr(extraction, "call_structured", _fake_call_structured)

    project = Project(name="Test Project")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    doc = Document(project_id=project.id, filename="notes.md", raw_text="We decided to use Postgres.")
    db_session.add(doc)
    db_session.commit()

    items = extraction.analyze_project(project, db_session)

    assert len(items) >= 2
    doc_from_db = db_session.get(Document, doc.id)
    assert doc_from_db.doc_type.value == "decision_record"

    decision_item = next(i for i in items if i.item_type == ItemType.decision)
    assert decision_item.status == ItemStatus.confirmed
    assert decision_item.conflict_group_id is not None  # flagged as conflicting per the fake response

    action_item = next(i for i in items if i.item_type == ItemType.action_item)
    assert action_item.action_status == ActionStatus.proposed  # never auto-approved

    suggestions = [i for i in items if i.is_ai_suggestion]
    assert len(suggestions) == 1
    assert suggestions[0].action_status == ActionStatus.none


def test_suggestions_are_never_auto_approved_or_promoted(db_session, monkeypatch):
    """AI suggestions must never appear as approved/rejected/edited action items —
    only a human PATCH /items/{id}/action call may do that."""
    monkeypatch.setattr(extraction, "call_structured", _fake_call_structured)

    project = Project(name="Invariant Project")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    doc = Document(project_id=project.id, filename="notes.md", raw_text="Some notes.")
    db_session.add(doc)
    db_session.commit()

    items = extraction.analyze_project(project, db_session)

    for item in items:
        assert item.action_status in (ActionStatus.none, ActionStatus.proposed)
