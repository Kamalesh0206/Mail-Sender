"""Database Session and Engine Initialization for WishMail AI."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator
import logging

from backend.config.settings import settings
from backend.database.models import Base, AppSetting, FriendGroup

logger = logging.getLogger("wishmail.database")

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
    """Create tables if they don't exist and seed default settings and groups."""
    Base.metadata.create_all(bind=engine)
    with get_db_context() as db:
        # 1. Seed AppSetting
        setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
        if not setting:
            setting = AppSetting(
                id=1,
                gmail_connected=False,
                timezone="Asia/Kolkata",
                default_send_time=f"{settings.DEFAULT_DAILY_HOUR:02d}:{settings.DEFAULT_DAILY_MINUTE:02d}",
                default_wish_tone="Friendly",
                auto_send_wishes=False,  # APPROVAL MODE by default
                auto_send_quotes=True,
                default_quote_greeting="Hi {{friend_name}},",
                default_quote_closing="Have a great day!",
                sender_name=settings.DEFAULT_SENDER_NAME,
                email_signature=settings.DEFAULT_SIGNATURE,
                ai_model=settings.DEFAULT_AI_MODEL,
                ai_personalization=True
            )
            db.add(setting)
            db.commit()
            logger.info("Initialized default AppSetting in database.")

        # 2. Seed Default Friend Groups
        default_groups = [
            ("Close Friends", "Core inner circle of friends"),
            ("College Friends", "University & college classmates"),
            ("Office Friends", "Work and professional colleagues"),
            ("Family", "Family and relatives"),
            ("All Friends", "General group for all friends")
        ]
        for name, desc in default_groups:
            existing_grp = db.query(FriendGroup).filter(FriendGroup.name == name).first()
            if not existing_grp:
                grp = FriendGroup(name=name, description=desc)
                db.add(grp)
        db.commit()
