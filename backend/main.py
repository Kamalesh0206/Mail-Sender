"""FastAPI Main Application Entrypoint for AI Birthday & Wishes Email Agent."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from backend.config.settings import settings
from backend.database.session import init_db
from backend.scheduler.daily_scheduler import start_scheduler, shutdown_scheduler
from backend.routers import (
    friends_router,
    wishes_router,
    auth_router,
    settings_router,
    stats_router
)

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("email_agent")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager handling startup and shutdown."""
    logger.info("Initializing database tables and defaults...")
    init_db()

    if settings.SCHEDULER_ENABLED:
        logger.info("Starting background scheduler...")
        start_scheduler()

    yield

    if settings.SCHEDULER_ENABLED:
        logger.info("Shutting down background scheduler...")
        shutdown_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-ready AI Birthday & Wishes Email Agent using Google Gemini & Gmail API.",
    lifespan=lifespan,
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)

# Setup CORS for React frontend
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(stats_router, prefix=settings.API_V1_PREFIX)
app.include_router(friends_router, prefix=settings.API_V1_PREFIX)
app.include_router(wishes_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "docs": f"{settings.API_V1_PREFIX}/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
