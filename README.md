# Document-to-Action Project Assistant

Upload up to three project documents (meeting notes, requirement drafts, implementation notes,
project updates, decision records). An AI workflow classifies each document, extracts facts,
decisions, assumptions, risks, open questions, and action items — always linked back to their
source document and section — flags repeated or conflicting statements across documents,
retrieves relevant standards from a small organizational knowledge base, and suggests items the
documents seem to be missing. A human reviews everything: correcting extracted content,
re-classifying status (confirmed / assumption / unresolved), resolving conflicts, and
approving/rejecting/editing proposed action items. **The AI never creates or assigns a task on
its own** — every action item starts `proposed` and only a human review action can change that.

**Live deployment:**
- Frontend (Vercel): https://frontend-mu-seven-23.vercel.app
- Backend (Render): https://option-a-document-assistant-backend.onrender.com
  (free tier — the first request after a period of inactivity can take up to ~50s to wake the
  instance)
- Repo: https://github.com/KaranPatelDev/option-a-document-assistant

## Architecture

```
Next.js (App Router, TypeScript, Tailwind)  --  fetch, NEXT_PUBLIC_API_URL
        |
        v
FastAPI backend (Python)  --  SQLAlchemy models  --  Postgres
        |
        v
Groq (llama-3.3-70b-versatile), OpenAI-compatible chat completions API,
JSON-schema-constrained structured output
```

- `backend/app/services/llm.py` — thin wrapper around the LLM call, logs model/latency/token
  usage for every call (`app.llm` logger).
- `backend/app/services/extraction.py` — the actual AI workflow: classify → extract →
  cross-document conflict detection → suggest missing items. Contains the hard invariant that
  no code path here ever sets an action item's status to anything but `proposed` — only the
  human-review API endpoints (`PATCH /items/{id}/action`) can approve/reject/edit.
- `backend/app/services/knowledge_base.py` — a small (6-entry) organizational standards
  knowledge base, retrieved by keyword overlap (see "Intentionally excluded" below).
- `frontend/` — project list, upload + review workspace (tabs by item type, conflict banners,
  AI-suggestions panel, approve/reject/edit controls), and a saved-summary view.

## Setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL and GROQ_API_KEY
uvicorn app.main:app --reload
```

The app creates its own tables on startup (`Base.metadata.create_all`) — no separate migration
step needed for this submission (see "Intentionally excluded").

Postgres locally: easiest is a single Docker container —
`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16` and then
`DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/option_a`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL if backend isn't on localhost:8000
npm run dev
```

Visit `http://localhost:3000`.

## Tests

```bash
cd backend
pytest -q
```

All LLM calls are mocked in tests (a fixture replaces `app.services.extraction.call_structured`
with canned structured responses) — the suite runs with no network access and no API key needed.
Covers: document classification/extraction parsing, conflict-group linking, the
never-auto-approve invariant, all human-review PATCH endpoints, and the summary save/view
round-trip with source links intact.

The full workflow was also verified end-to-end in a real browser against the **real** Groq API:
two documents were uploaded (sprint planning notes plus a deliberately conflicting decision
record naming a different owner for the same decision), both were correctly classified
("meeting notes" 90%, "decision record" 99%), the cross-document conflict was correctly detected
and cited both source documents, resolving it persisted and turned the banner green, an action
item was approved through the UI and the approval survived a page reload, and a saved summary
correctly showed every item's source document/section and status. Five AI-suggested missing
items were also generated, all correctly marked as suggestions (never auto-added as real action
items).

## Completed scope

- Upload ≤3 text-based documents (`.txt`/`.md` or paste)
- AI classification of each document's type
- AI extraction of facts/decisions/assumptions/risks/open questions/action items, each linked to
  its source document and section
- Cross-document conflict/repetition detection
- Keyword-based retrieval of relevant items from a small standards knowledge base
- AI-suggested missing items, clearly separated from extracted items, never auto-saved
- Human review: edit content, change status, approve/reject/edit action items, resolve conflicts
- Save a reviewed action summary; view it later with every item's source visible
- Structured logging of every LLM call (model, latency, token usage) and state-changing request
- Backend test suite covering the extraction pipeline, invariants, and all review endpoints

## Intentionally excluded / simplified

- **No authentication.** Single-tenant tool — out of scope for the assignment's core ask.
- **No Alembic migrations.** Uses `Base.metadata.create_all()` on startup instead. Reasonable
  for a fixed, small schema built in one sitting; a production system would use versioned
  migrations.
- **Knowledge base retrieval is keyword-overlap, not vector embeddings.** The knowledge base is
  6 short entries — embeddings would be overkill and add a dependency (vector store) with no
  real benefit at this scale. Documented here as a deliberate trade-off.
- **No real-time updates.** The review workspace re-fetches after each action rather than
  streaming/websocket updates — simpler and sufficient for a single-user review session.
- **No retry/backoff tuning beyond the SDK default.** The OpenAI-compatible client's default
  retry handles Groq's free-tier rate limits (observed during testing), but there's no queueing
  or backpressure for high concurrent load.

## Known limitations

- Conflict detection and the "suggest missing items" pass only run once per full re-analyze; if
  you add a 4th piece of context after already analyzing, you must re-run Analyze (which
  currently re-extracts everything from scratch rather than incrementally updating).
- Section references depend entirely on what the source document's own structure exposes (a
  heading, a speaker name, a paragraph number) — unstructured prose with no internal structure
  will get a vaguer `section_ref`.
- Frontend test coverage is a handful of component-level checks, not exhaustive — see
  AGENT_USAGE.md for what was and wasn't covered.

## Deployment

- **Frontend (done)**: Vercel project `option-a-document-assistant`, deployed from `frontend/` —
  https://frontend-mu-seven-23.vercel.app
- **Backend (done)**: Render web service (Python), root directory `backend` —
  https://option-a-document-assistant-backend.onrender.com
  1. render.com → New → Web Service → connect GitHub repo `KaranPatelDev/option-a-document-assistant`
  2. Root Directory: `backend`
  3. Build Command: `pip install -r requirements.txt`
  4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  5. Provision a Postgres instance (Render free tier only allows one free Postgres per account;
     this project shares a single free Neon Postgres instance with Option B — the two apps' table
     names don't collide, so this is safe) → copy its connection string
  6. On the web service, set env vars:
     - `DATABASE_URL` = the Postgres connection string, with `postgresql://` changed to
       `postgresql+psycopg://` (SQLAlchemy driver requirement — the project uses `psycopg` v3,
       not `psycopg2`)
     - `GROQ_API_KEY` = your Groq key
     - `CORS_ORIGINS` = `https://frontend-mu-seven-23.vercel.app`
     - `PYTHON_VERSION` = `3.12.7` (Render defaults to a newer Python with no prebuilt
       `pydantic-core` wheel, which fails to build from source on Render's read-only filesystem)
  7. Set `NEXT_PUBLIC_API_URL` in the Vercel project's environment variables to the Render service
     URL, then redeploy the frontend (`vercel --prod` from `frontend/`, or via the Vercel
     dashboard's Redeploy button) so the build picks up the new value.
  8. Since there's no Alembic migration step, a schema change to an already-existing table (e.g.
     adding a column) requires a manual `ALTER TABLE` against the live database — `create_all()`
     only creates missing tables, it doesn't alter existing ones.
