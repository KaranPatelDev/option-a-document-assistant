from app.models import ConflictGroup, Document, ExtractedItem, ItemStatus, ItemType, Project


def test_resolve_conflict(client, db_session):
    project = Project(name="P")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    doc = Document(project_id=project.id, filename="f.txt", raw_text="text")
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    group = ConflictGroup(project_id=project.id, description="Conflicting owners")
    db_session.add(group)
    db_session.commit()
    db_session.refresh(group)

    item = ExtractedItem(
        project_id=project.id,
        document_id=doc.id,
        section_ref="p1",
        item_type=ItemType.decision,
        content="Owner is Alice",
        status=ItemStatus.confirmed,
        conflict_group_id=group.id,
    )
    db_session.add(item)
    db_session.commit()

    resp = client.get(f"/projects/{project.id}/conflicts")
    assert resp.status_code == 200
    conflicts = resp.json()
    assert len(conflicts) == 1
    assert conflicts[0]["resolved_by_user"] is False

    resolve_resp = client.patch(f"/conflicts/{group.id}", json={"resolution_note": "Confirmed Alice is the owner"})
    assert resolve_resp.status_code == 200
    body = resolve_resp.json()
    assert body["resolved_by_user"] is True
    assert body["resolution_note"] == "Confirmed Alice is the owner"
