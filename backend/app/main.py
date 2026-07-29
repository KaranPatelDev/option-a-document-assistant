import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import Base, engine
from app.routers import conflicts, documents, items, projects, summaries

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Simplification: create_all instead of Alembic migrations, documented in README.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Document-to-Action Project Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(items.router)
app.include_router(conflicts.router)
app.include_router(summaries.router)
