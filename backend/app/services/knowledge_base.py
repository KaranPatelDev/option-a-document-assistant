"""Small organizational knowledge base retrieved by keyword overlap.

Intentionally not a vector-embedding search: the knowledge base is a handful of
short standards snippets, and keyword overlap is transparent, deterministic, and
sufficient at this scale. Documented as a deliberate simplification in README.
"""

import re

from sqlalchemy.orm import Session

from app.models import StandardsDoc

_WORD_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> set[str]:
    return set(_WORD_RE.findall(text.lower()))


SEED_STANDARDS = [
    {
        "title": "Decision records need an owner",
        "content": "Every decision record should name a single accountable owner and the date the decision takes effect.",
        "keywords": ["decision", "owner", "accountable", "effective", "date"],
    },
    {
        "title": "Risks need a mitigation owner and a review date",
        "content": "A logged risk should include a mitigation owner, a mitigation plan, and a date to revisit the risk.",
        "keywords": ["risk", "mitigation", "owner", "review", "plan"],
    },
    {
        "title": "Open questions need a target resolution date",
        "content": "Open questions should specify who is expected to answer them and by when, or they tend to go stale.",
        "keywords": ["question", "open", "resolution", "deadline", "owner"],
    },
    {
        "title": "Action items need a single owner, not a team",
        "content": "Action items assigned to a team rather than a named individual are frequently never completed.",
        "keywords": ["action", "item", "owner", "team", "assigned"],
    },
    {
        "title": "Assumptions must be revisited before implementation",
        "content": "Assumptions carried from requirement drafts into implementation should be explicitly re-confirmed before build starts.",
        "keywords": ["assumption", "requirement", "implementation", "confirm", "revisit"],
    },
    {
        "title": "Conflicting requirements should block sign-off",
        "content": "Two requirement statements that contradict each other should be resolved before a decision record is finalized.",
        "keywords": ["conflict", "requirement", "contradiction", "sign-off", "decision"],
    },
]


def seed_standards(db: Session) -> None:
    if db.query(StandardsDoc).count() > 0:
        return
    for s in SEED_STANDARDS:
        db.add(StandardsDoc(title=s["title"], content=s["content"], keywords=s["keywords"]))
    db.commit()


def retrieve_relevant_standards(db: Session, text: str, top_k: int = 2) -> list[StandardsDoc]:
    """Return up to top_k StandardsDoc rows whose keywords overlap the given text."""
    tokens = _tokenize(text)
    if not tokens:
        return []

    scored: list[tuple[int, StandardsDoc]] = []
    for doc in db.query(StandardsDoc).all():
        overlap = len(tokens.intersection({k.lower() for k in doc.keywords}))
        if overlap > 0:
            scored.append((overlap, doc))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]
