from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import exercises, home, logs, plan, today, workouts
from app.core.config import settings

app = FastAPI(title="PISTE API", version="0.2.0", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@api.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


for r in (home.router, today.router, plan.router, exercises.router, workouts.router, logs.router):
    api.include_router(r)

app.include_router(api)
