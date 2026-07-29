from app.models import Document, ExtractedItem, ItemStatus, ItemType, Project


def test_save_and_view_summary_preserves_source_links(client, db_session):
    project = Project(name="P")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    doc = Document(project_id=project.id, filename="requirements.md", raw_text="text")
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    item = ExtractedItem(
        project_id=project.id,
        document_id=doc.id,
        section_ref="Section 2",
        item_type=ItemType.decision,
        content="Use Postgres",
        status=ItemStatus.confirmed,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)

    save_resp = client.post(f"/projects/{project.id}/summary", json={"item_ids": [str(item.id)]})
    assert save_resp.status_code == 200
    summary_id = save_resp.json()["id"]

    view_resp = client.get(f"/summaries/{summary_id}")
    assert view_resp.status_code == 200
    body = view_resp.json()
    assert len(body["items"]) == 1
    saved_item = body["items"][0]
    assert saved_item["content"] == "Use Postgres"
    assert saved_item["document_filename"] == "requirements.md"
    assert saved_item["section_ref"] == "Section 2"


def test_save_summary_requires_at_least_one_item(client, db_session):
    project = Project(name="P")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    resp = client.post(f"/projects/{project.id}/summary", json={"item_ids": []})
    assert resp.status_code == 400
