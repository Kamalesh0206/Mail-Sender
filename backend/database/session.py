"""Database Session and Engine Initialization."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator
import logging

from backend.config.settings import settings
from backend.database.models import Base, AppSetting

logger = logging.getLogger("email_agent.database")

# Configure engine with connect_args for SQLite if sqlite is used
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager for background tasks and scheduler."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables if they don't exist and seed default settings."""
    Base.metadata.create_all(bind=engine)
    with get_db_context() as db:
        setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
        if not setting:
            setting = AppSetting(
                id=1,
                gmail_connected=False,
                automation_mode=settings.DEFAULT_APPROVAL_MODE,
                daily_send_time=f"{settings.DEFAULT_DAILY_HOUR:02d}:{settings.DEFAULT_DAILY_MINUTE:02d}",
                default_tone="Friendly",
                sender_name=settings.DEFAULT_SENDER_NAME,
                email_signature=settings.DEFAULT_SIGNATURE,
                ai_model=settings.DEFAULT_AI_MODEL,
                is_scheduler_running=settings.SCHEDULER_ENABLED
            )
            db.add(setting)
            db.commit()
            logger.info("Initialized default AppSetting in database.")
