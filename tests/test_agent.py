"""Comprehensive unit and integration test suite for AI Birthday & Wishes Email Agent."""

import pytest
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from backend.database.models import Base, Friend, WishHistory, AppSetting
from backend.services.encryption import encrypt_token, decrypt_token
from backend.services.gemini_service import gemini_service, _get_fallback_wish
from backend.agents.wish_agent import WishAgent
from backend.agents.occasions import get_occasion_handler, OCCASION_HANDLERS
from backend.scheduler.daily_scheduler import parse_time_string


# Test SQLite in-memory database
TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    # Seed default AppSetting
    setting = AppSetting(
        id=1,
        gmail_connected=False,
        automation_mode="APPROVAL",
        daily_send_time="08:00",
        default_tone="Friendly",
        sender_name="Kamalesh",
        email_signature="Best wishes,\nKamalesh",
        ai_model="gemini-2.5-flash"
    )
    session.add(setting)
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_encryption_and_decryption():
    """Verify that sensitive OAuth tokens are encrypted and decrypted correctly."""
    sample_refresh_token = "1//04test_google_oauth_refresh_token_xyz"
    encrypted = encrypt_token(sample_refresh_token)
    
    assert encrypted != sample_refresh_token
    assert len(encrypted) > 20
    
    decrypted = decrypt_token(encrypted)
    assert decrypted == sample_refresh_token


def test_friend_creation_and_query(db_session):
    """Verify friend record persistence with occasion and date fields."""
    friend = Friend(
        name="Arun Kumar",
        email="arun@example.com",
        birth_month=10,
        birth_day=1,
        birth_year=1995,
        occasion_type="Birthday",
        relationship_type="Colleague",
        personal_notes="Loves cycling and coffee",
        preferred_tone="Funny",
        is_active=True
    )
    db_session.add(friend)
    db_session.commit()
    db_session.refresh(friend)

    assert friend.id is not None
    assert friend.name == "Arun Kumar"
    assert friend.birth_month == 10
    assert friend.birth_day == 1


def test_duplicate_protection_constraint(db_session):
    """Verify requirement 8: database constraint strictly prevents duplicate wish in the same year."""
    friend = Friend(
        name="Priya Sharma",
        email="priya@example.com",
        birth_month=10,
        birth_day=1,
        occasion_type="Birthday",
        relationship_type="Friend"
    )
    db_session.add(friend)
    db_session.commit()
    db_session.refresh(friend)

    wish1 = WishHistory(
        friend_id=friend.id,
        occasion_type="Birthday",
        year=2026,
        recipient_name=friend.name,
        recipient_email=friend.email,
        tone="Friendly",
        generated_subject="Happy Birthday Priya!",
        generated_body="Wishing you the best day!",
        status="SENT",
        scheduled_for=datetime.date(2026, 10, 1),
        sent_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db_session.add(wish1)
    db_session.commit()

    # Attempting to insert a second wish for same friend, same occasion, same year must violate constraint
    wish2 = WishHistory(
        friend_id=friend.id,
        occasion_type="Birthday",
        year=2026,
        recipient_name=friend.name,
        recipient_email=friend.email,
        tone="Friendly",
        generated_subject="Another Birthday Email",
        generated_body="Duplicate wish attempt",
        status="PENDING_APPROVAL",
        scheduled_for=datetime.date(2026, 10, 1)
    )
    db_session.add(wish2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    
    db_session.rollback()


def test_fallback_wish_generation_tones():
    """Verify wish generation produces expected subjects and bodies across all supported tones."""
    tones = ["Friendly", "Professional", "Funny", "Emotional", "Casual"]
    for tone in tones:
        wish = _get_fallback_wish(
            name="Rahul",
            occasion="Birthday",
            relationship="Mentor",
            tone=tone,
            personal_notes="Great leader",
            sender_name="Kamalesh",
            signature="Best wishes,\nKamalesh"
        )
        assert "subject" in wish and len(wish["subject"]) > 5
        assert "body" in wish and len(wish["body"]) > 20
        assert "Rahul" in wish["body"] or "Rahul" in wish["subject"]


def test_daily_agent_scan_workflow(db_session):
    """Test full daily scan workflow finding today's birthdays and staging for approval."""
    today = datetime.date(2026, 10, 1)
    
    # Friend 1: Birthday today
    f1 = Friend(
        name="Divya",
        email="divya@example.com",
        birth_month=10,
        birth_day=1,
        occasion_type="Birthday",
        is_active=True
    )
    # Friend 2: Birthday tomorrow
    f2 = Friend(
        name="Suresh",
        email="suresh@example.com",
        birth_month=10,
        birth_day=2,
        occasion_type="Birthday",
        is_active=True
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    # Run check for today
    results = WishAgent.run_daily_check(db=db_session, target_date=today)
    assert results["found_count"] == 1
    assert len(results["pending"]) == 1
    assert results["pending"][0]["name"] == "Divya"

    # Verify wish history in database
    pending_wish = db_session.query(WishHistory).filter(WishHistory.friend_id == f1.id).first()
    assert pending_wish is not None
    assert pending_wish.status == "PENDING_APPROVAL"
    assert pending_wish.year == 2026


def test_occasion_handlers_extensibility():
    """Verify all occasion handlers exist and produce appropriate milestone titles."""
    target_date = datetime.date(2026, 10, 1)
    for key, handler in OCCASION_HANDLERS.items():
        assert handler.occasion_key == key
        title = handler.format_celebration_title("Sam", 2020, target_date)
        assert "Sam" in title


def test_parse_scheduler_time():
    """Verify scheduler time parsing."""
    h, m = parse_time_string("09:30")
    assert h == 9 and m == 30

    h_def, m_def = parse_time_string("invalid")
    assert h_def == 8 and m_def == 0
