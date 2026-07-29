from app.models import ActionStatus, Document, ExtractedItem, ItemStatus, ItemType, Project


def _make_project_with_item(db_session, action_status=ActionStatus.proposed):
    project = Project(name="P")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    doc = Document(project_id=project.id, filename="f.txt", raw_text="text")
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    item = ExtractedItem(
        project_id=project.id,
        document_id=doc.id,
        section_ref="p1",
        item_type=ItemType.action_item,
        content="Do the thing",
        status=ItemStatus.unresolved,
        ai_confidence=0.5,
        action_status=action_status,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return project, doc, item


def test_patch_item_content_and_status(client, db_session):
    project, doc, item = _make_project_with_item(db_session)

    resp = client.patch(f"/items/{item.id}", json={"content": "Corrected content", "status": "confirmed"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["content"] == "Corrected content"
    assert body["status"] == "confirmed"
    # Regression: PATCH must still report the source document, not just list_items.
    assert body["document_filename"] == "f.txt"


def test_approve_action_item_requires_explicit_human_call(client, db_session):
    project, doc, item = _make_project_with_item(db_session, action_status=ActionStatus.proposed)

    # Before the PATCH, it must still be "proposed" — never auto-approved.
    assert item.action_status == ActionStatus.proposed

    resp = client.patch(f"/items/{item.id}/action", json={"action_status": "approved"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["action_status"] == "approved"
    # Regression: caught via manual browser testing — this endpoint used to return
    # the raw ORM object and silently drop document_filename, showing "—" as the
    # source in the UI right after approving an item.
    assert body["document_filename"] == "f.txt"


def test_reject_action_item(client, db_session):
    project, doc, item = _make_project_with_item(db_session)
    resp = client.patch(f"/items/{item.id}/action", json={"action_status": "rejected"})
    assert resp.status_code == 200
    assert resp.json()["action_status"] == "rejected"


def test_invalid_action_status_rejected(client, db_session):
    project, doc, item = _make_project_with_item(db_session)
    resp = client.patch(f"/items/{item.id}/action", json={"action_status": "bogus"})
    assert resp.status_code == 422  # pydantic enum validation failure


def test_list_items_includes_document_filename(client, db_session):
    project, doc, item = _make_project_with_item(db_session)
    resp = client.get(f"/projects/{project.id}/items")
    assert resp.status_code == 200
    items = resp.json()
    assert any(i["document_filename"] == "f.txt" for i in items)
