# Agent Usage

This project was built with **Claude Code** as the primary coding agent, working from a
pre-written implementation plan (`plan.md` in this folder) that specified the data model, AI
workflow steps, API surface, and testing strategy up front.

## What was delegated to the agent

- Full backend scaffolding: SQLAlchemy models, Pydantic schemas, FastAPI routers, the LLM
  wrapper, and the multi-step extraction pipeline (classify → extract → detect conflicts →
  suggest missing items).
- The full Next.js frontend: API client, project list/create page, the review workspace (tabs,
  inline edit, conflict banners, AI-suggestions panel, action-item approve/reject controls), and
  the saved-summary view.
- The pytest suite, including the mocking strategy for LLM calls.
- This documentation.

## What was hand-reviewed / verified, not just trusted

- **Every backend change was run through the real test suite before moving on**, not just
  written and assumed correct. `pytest -q` was run after every meaningful chunk of backend work.
- **The AI workflow was verified against a real LLM**, not just mocked tests — a hand-written
  sample document (sprint planning notes with a decision, an assumption, a risk, an open
  question, and an action item) was pushed through `/analyze` against the live API and the
  actual extracted items were read and checked by hand (see README's Tests section for the
  output). This is what caught that the extraction pipeline correctly keeps action items at
  `proposed` status and never lets an AI suggestion masquerade as a real action item.
- The frontend was type-checked (`tsc --noEmit`) and production-built (`next build`) to catch
  errors a human reviewing generated code by eye would likely miss (e.g. a `useSearchParams`
  page needing to render as dynamic rather than statically prerendered).

## Representative prompts

- "Build the FastAPI models for Option A per the plan: Project, Document, ExtractedItem,
  ConflictGroup, StandardsDoc, ActionSummary — using cross-dialect-portable column types so
  tests can run against SQLite without needing a live Postgres."
- "Write the extraction service: classify each document, extract structured items, run a
  cross-document conflict-detection pass, and generate suggestions for missing items. Enforce in
  code — not just in the prompt — that nothing in this file can ever set an action item to
  approved/rejected/edited; only the human-review endpoint can do that."
- "Write pytest tests for the extraction pipeline using a fixture that mocks `call_structured`
  and returns canned structured responses per schema type, so tests need no network access."
- "Build the review workspace page: tabs by item type, inline content editing, a status
  dropdown, conflict banners with a resolve action, and a separate AI-suggestions panel that
  makes clear those items were never extracted from a document."

## Agent mistakes encountered and how they were caught

1. **Pinned an ancient `anthropic` SDK version (0.34.2) that predates the `output_config`
   structured-outputs parameter.** The plan called for structured JSON output, but the
   requirements.txt the agent generated pinned a version from mid-2024 that didn't have that
   API. This wasn't caught by code review — it was only caught by actually running a live
   request, which failed with `TypeError: Messages.create() got an unexpected keyword argument
   'output_config'`. Fixed by bumping to the latest SDK version and re-running.
2. **A response-shape bug in the conflicts API only surfaced under a real test run.**
   `list_conflicts` originally called `ConflictOut.model_validate(g)` directly on the
   SQLAlchemy `ConflictGroup` ORM object, which doesn't have an `item_ids` attribute (that's
   assembled from a separate query). This passed a naive code review but failed the very first
   pytest run against it with a Pydantic `ValidationError`. Fixed by building the response
   object explicitly field-by-field instead of relying on `from_attributes` auto-mapping for a
   field that isn't a real ORM attribute. This is exactly why the plan called for running tests
   continuously rather than trusting generated code by inspection.
3. **The same class of bug recurred in the items API, and pytest didn't catch it — only manual
   browser testing did.** `PATCH /items/{id}` and `PATCH /items/{id}/action` both returned the
   raw `ExtractedItem` ORM object as the response, which (like `ConflictGroup` above) has no
   `document_filename` attribute — FastAPI silently serialized it as `null` rather than erroring,
   because `document_filename` is an optional field on the response schema. The existing pytest
   suite for these endpoints only asserted on `content`/`status`/`action_status`, never on
   `document_filename`, so it stayed green. It was caught by actually clicking "Approve" on a
   real action item in the browser and watching the "Source: —" placeholder appear where the
   filename should have been. Fixed the same way as #2 (explicit response construction via a
   shared `_to_item_out` helper), and added regression assertions to the existing tests for both
   endpoints so this can't silently regress again. **Takeaway kept from this build**: passing
   pytest is necessary but not sufficient — a field that's optional in the schema can be silently
   wrong in a way no test happens to check, and only exercising the actual UI surfaced it.
4. **Provider churn due to account billing, not a code defect.** The original plan (and the
   user's initial choice) was Anthropic Claude. Live testing surfaced `credit balance too low`
   on the first Anthropic key, then `insufficient_quota` on two different OpenAI keys. None of
   these were code bugs — each failure was confirmed to be a billing/quota rejection *after* the
   request was accepted and validated by the provider (i.e. the integration code was correct).
   The user chose to switch providers to Groq (OpenAI-compatible API, free tier), which required
   a genuine code change (swapping the strict `json_schema` response format for a `json_object`
   + schema-in-prompt approach, since Groq's strict-schema support varies by model) — this was
   verified against the real Groq API and worked correctly, including catching and logging two
   429 rate-limit retries automatically handled by the SDK's default backoff.

## How output was verified overall

- Automated: `pytest -q` (backend, 10 tests, all passing, run repeatedly during development),
  `tsc --noEmit` and `next build` (frontend).
- Manual: a real end-to-end run against the live Groq API, reading every extracted item's type,
  status, and action_status by hand to confirm the "never auto-approve" invariant held in
  practice and that AI suggestions were correctly distinguished from real extracted items.
- A full manual pass through the actual browser UI was also completed (upload → analyze →
  review conflicting documents → resolve conflict → approve an action item → save summary → view
  summary), against the real Groq API, not mocks. This is what caught mistake #3 above — a bug
  that every passing pytest run had missed.
