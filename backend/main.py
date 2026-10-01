"""FastAPI Main Application Entrypoint for WishMail AI.

Tagline: Personal wishes. Meaningful quotes. Automatically delivered.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from backend.config.settings import settings
from backend.database.session import init_db
from backend.scheduler.daily_scheduler import start_scheduler, shutdown_scheduler
from backend.routers import (
    friends_router,
    groups_router,
    occasions_router,
    quotes_router,
    calendar_router,
    history_router,
    dashboard_router,
    auth_router,
    settings_router
)

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("wishmail")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager handling startup and shutdown."""
    logger.info("Initializing WishMail AI database tables and default groups...")
    init_db()

    if settings.SCHEDULER_ENABLED:
        logger.info("Starting background scheduler in Asia/Kolkata timezone...")
        start_scheduler()

    yield

    if settings.SCHEDULER_ENABLED:
        logger.info("Shutting down background scheduler...")
        shutdown_scheduler()


app = FastAPI(
    title="WishMail AI",
    version=settings.APP_VERSION,
    description="Personal wishes. Meaningful quotes. Automatically delivered.",
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

# Register API Routers under /api/v1
routers = [
    dashboard_router,
    friends_router,
    groups_router,
    occasions_router,
    quotes_router,
    calendar_router,
    history_router,
    auth_router,
    settings_router
]

for r in routers:
    app.include_router(r, prefix=settings.API_V1_PREFIX)
    # Also include at root level to satisfy endpoints like GET /dashboard, GET /calendar, etc.
    app.include_router(r)


@app.get("/")
def root():
    return {
        "app": "WishMail AI",
        "tagline": "Personal wishes. Meaningful quotes. Automatically delivered.",
        "version": settings.APP_VERSION,
        "status": "healthy",
        "docs": f"{settings.API_V1_PREFIX}/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
