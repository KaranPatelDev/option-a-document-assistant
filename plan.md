# Plan: Document-to-Action Project Assistant (Option A)

## Context

This is one of two candidate submissions for a hiring take-home assignment. The task: build an application where a user provides up to three project documents (meeting notes, requirement drafts, implementation notes, project updates, decision records), and an AI workflow identifies each document's type, extracts confirmed facts/decisions/assumptions/risks/open questions/action items, distinguishes confirmed information from interpretation, flags repeated/conflicting statements, links every item to its source document and section, retrieves relevant standards from a small organizational knowledge base, and suggests missing questions or actions. The user must be able to correct extracted info, mark items as fact/assumption/unresolved, resolve conflicts, edit/approve/reject proposed action items, save a reviewed action summary, and view the source behind every saved item. **The AI must never create or assign tasks automatically** — every action item stays "proposed" until a human approves it.

Scoring rewards a complete, reliable submission (medium difficulty, weight 1.7) — prioritize a fully working core loop over extra features.

**Confirmed stack:** Python **FastAPI** backend, **Next.js** (TypeScript) frontend, **Postgres** database, **Anthropic Claude (`claude-opus-5`)** via the Messages API with structured outputs (JSON schema) for extraction. No auth (single-tenant tool, explicitly out of scope). User has GitHub/hosting accounts ready.

## Repository layout

```
option-a-document-assistant/
  backend/
    app/
      main.py
      db.py
      models.py
      schemas.py
      routers/
        projects.py
        documents.py
        items.py
        conflicts.py
        summaries.py
      services/
        llm.py            # Anthropic client wrapper
        extraction.py      # classify/extract/conflict-detect/suggest pipeline
        knowledge_base.py   # keyword-overlap retrieval over StandardsDoc
      config.py            # pydantic-settings
    alembic/                # migrations
    tests/
      test_extraction.py
      test_items_api.py
      test_conflicts_api.py
      test_no_autoapprove_invariant.py
    requirements.txt
    Dockerfile (optional, for local Postgres convenience)
  frontend/
    app/
      page.tsx                        # project list/create
      projects/[id]/page.tsx          # upload + review workspace
      projects/[id]/summary/page.tsx  # saved summary view
    lib/api.ts
    components/
      UploadPanel.tsx
      ItemsTable.tsx
      ConflictBanner.tsx
      ActionItemControls.tsx
      SuggestionsPanel.tsx
    package.json
  README.md
  AGENT_USAGE.md
  .env.example
```

## Data model (`backend/app/models.py`)

- `Project(id, name, created_at)`
- `Document(id, project_id, filename, doc_type[meeting_notes|requirement_draft|implementation_notes|project_update|decision_record|unknown], raw_text, uploaded_at)` — `doc_type` is AI-classified, user-editable.
- `ExtractedItem(id, project_id, document_id, section_ref, item_type[fact|decision|assumption|risk|open_question|action_item], content, status[confirmed|assumption|unresolved], ai_confidence, is_action_proposed, action_status[none|proposed|approved|rejected|edited], conflict_group_id nullable)`
- `ConflictGroup(id, project_id, description, resolution_note nullable, resolved_by_user bool)`
- `StandardsDoc(id, title, content)` — small seeded table (5–8 rows) acting as the organizational knowledge base (e.g. "decision records must name an owner", "risks need a mitigation owner"). Retrieved via simple keyword-overlap scoring — no vector DB, documented as an intentional simplification in README.
- `ActionSummary(id, project_id, saved_at, item_ids[])` — the final human-saved "reviewed project action summary."

## AI workflow (`backend/app/services/extraction.py`, `llm.py`)

1. **Classify** each uploaded document (≤3) → one Claude call per doc → structured `{doc_type, confidence}`.
2. **Extract** per document → structured JSON list of `{item_type, content, section_ref, status_guess, confidence}`. Prompt explicitly instructs distinguishing confirmed statements from interpretation, and citing the section/paragraph each item came from.
3. **Cross-document pass**: one Claude call given all extracted items across all docs → flags repeated/conflicting statements → creates `ConflictGroup` rows linking the relevant items with a plain-language description.
4. **Knowledge base retrieval**: keyword-overlap match against `StandardsDoc` rows relevant to each risk/decision item; attached as read-only suggestions, never stored as facts.
5. **Suggest missing items**: one Claude call given the full extracted set → suggested (unconfirmed) open questions / action items the docs seem to be missing. Rendered as clearly-labeled AI suggestions the user can promote into real items — never auto-added.
6. **Hard invariant, enforced in code not just prompt**: no code path in `services/` ever sets `action_status` to anything but `proposed`. Only the human-review API endpoints (`PATCH /items/{id}/action`) can set `approved`/`rejected`/`edited`. Add an explicit unit test asserting this (`test_no_autoapprove_invariant.py`).

## API endpoints

- `POST /projects`, `GET /projects/{id}`
- `POST /projects/{id}/documents` — upload ≤3 text-based docs (.txt/.md or pasted text)
- `POST /projects/{id}/analyze` — runs the full AI workflow above, idempotent per document set
- `GET /projects/{id}/items` — extracted items + conflicts + suggestions
- `PATCH /items/{id}` — edit content / change status (fact|assumption|unresolved)
- `PATCH /items/{id}/action` — approve|reject|edit an action item (human-only — see invariant above)
- `PATCH /conflicts/{id}` — resolve/explain a conflict
- `POST /projects/{id}/summary` — save reviewed action summary
- `GET /summaries/{id}` — view saved summary, every item showing its source doc + section

## Frontend pages

- `/` — project list / create
- `/projects/[id]` — upload panel (≤3 docs) → "Analyze" → review workspace with tabs (Facts / Decisions / Assumptions / Risks / Open Questions / Action Items), each item showing source doc+section, edit/status controls, conflict banners with resolve UI, an AI-suggested-missing-items panel (clearly marked, "add to review" only — never auto-saved)
- `/projects/[id]/summary` — final saved summary, one section per item type, each item linking back to its source

Loading/empty/validation/success/failure states required on every page (per assignment spec): empty project list, no-documents-yet state, upload validation errors (wrong file type, >3 docs), analyze-in-progress spinner, analyze failure banner with retry, save-summary success confirmation.

## Testing plan

- `pytest` with a fixture mocking `anthropic.Anthropic().messages.create` to return canned structured JSON — no real API calls in CI.
- Cover: document classification/extraction parsing, conflict-group linking logic, the no-auto-approve invariant, all human-review PATCH endpoints' state transitions, summary save/view round-trip with source references intact.
- A handful of frontend component tests (Vitest + React Testing Library) for the review workspace (approve/reject/edit reflected in UI) — not exhaustive; note as a documented limitation in README.

## Documentation deliverables

- **README.md**: setup (backend venv + `pip install -r requirements.txt`, `alembic upgrade head`, `uvicorn app.main:app --reload`; frontend `npm install && npm run dev`), architecture (ASCII diagram: Next.js → FastAPI → Postgres, FastAPI → Anthropic API), completed scope vs intentionally excluded (auth, multi-user, vector search/embeddings, real-time updates — polling/manual refresh instead), test commands, known limitations, live deployment URL.
- **AGENT_USAGE.md**: tools used (Claude Code), representative prompts used per layer (backend scaffolding, extraction prompt design, frontend review workspace), what was delegated vs hand-reviewed, at least one concrete agent mistake or rejected suggestion encountered during the actual build and how it was caught, how output was verified (tests + manual trace-back of extracted items to source docs).
- **.env.example**: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL` — names only, no real values.

## Deployment

- Backend: Render web service (Python/FastAPI), Postgres via Render or Neon, `ANTHROPIC_API_KEY` as a secret env var, Alembic migration run on release/build step.
- Frontend: Vercel project pointed at `frontend/`, `NEXT_PUBLIC_API_URL` pointing at the deployed backend.
- Confirm CORS on the backend allows the deployed Vercel origin.

## Build order

1. Backend: models → Alembic migration → LLM service + extraction pipeline → routers → tests green.
2. Frontend: api client → upload panel → review workspace (tabs, edit/approve/reject, conflicts) → suggestions panel → summary page.
3. Local end-to-end smoke test with a real 2–3 document sample set (e.g. sample meeting notes + a requirements doc with an intentional conflict) — confirm extraction, conflict detection, and summary save all work through the UI.
4. Write README / AGENT_USAGE / .env.example.
5. Deploy (Render backend + Postgres, Vercel frontend), re-run the smoke test against the live URL.

## Verification

- `pytest -q` green.
- Manual smoke test: upload sample docs → Analyze → verify extracted items show correct source doc/section, verify an intentionally-conflicting pair of documents produces a `ConflictGroup`, exercise approve/reject/edit on action items and confirm state persists across a page reload (DB-backed).
- Confirm `ANTHROPIC_API_KEY` calls actually hit `claude-opus-5` and structured JSON parses without manual coercion (check logs for token usage per `response.usage`).
- Repeat the smoke test against the deployed Vercel/Render URLs before considering this submission-ready.
