"""Comprehensive test suite for WishMail AI — AI Wishes & Quotes Email Agent."""

import pytest
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

from backend.database.models import (
    Base,
    Friend,
    FriendGroup,
    FriendGroupMember,
    Occasion,
    Quote,
    QuoteSchedule,
    EmailHistory,
    AppSetting
)
from backend.services.encryption import encrypt_token, decrypt_token
from backend.services.gemini_service import gemini_service
from backend.services.quote_service import quote_service
from backend.agents.wish_agent import WishAgent

TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    setting = AppSetting(
        id=1,
        gmail_connected=False,
        timezone="Asia/Kolkata",
        default_send_time="08:00",
        default_wish_tone="Friendly",
        auto_send_wishes=False,
        auto_send_quotes=True,
        sender_name="Kamalesh",
        email_signature="Best wishes,\nKamalesh"
    )
    session.add(setting)

    grp = FriendGroup(name="Close Friends", description="Core circle")
    session.add(grp)
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_encryption_and_decryption():
    """Verify OAuth token symmetric encryption."""
    token = "1//04test_google_oauth_refresh_token_wishmail_xyz"
    enc = encrypt_token(token)
    assert enc != token
    assert decrypt_token(enc) == token


def test_friend_and_group_association(db_session):
    """Verify friend creation with birthday, anniversary, and group membership."""
    friend = Friend(
        name="Arun Kumar",
        email="arun@gmail.com",
        birthday="05 October",
        birth_month=10,
        birth_day=5,
        anniversary="12 December",
        anniversary_month=12,
        anniversary_day=12,
        relationship="Close Friend",
        personal_notes="Works as a software engineer and likes technology."
    )
    db_session.add(friend)
    db_session.commit()
    db_session.refresh(friend)

    grp = db_session.query(FriendGroup).first()
    db_session.add(FriendGroupMember(friend_id=friend.id, group_id=grp.id))
    db_session.commit()

    assert friend.id is not None
    assert len(friend.group_memberships) == 1
    assert friend.group_memberships[0].group.name == "Close Friends"


def test_generic_occasion_model(db_session):
    """Verify generic Occasion model handles Birthday, Anniversary, and Custom Occasion."""
    friend = Friend(name="Priya", email="priya@gmail.com")
    db_session.add(friend)
    db_session.commit()

    occ1 = Occasion(
        friend_id=friend.id,
        occasion_type="Birthday",
        title="Priya's Birthday",
        date_str="01 October",
        month=10,
        day=1
    )
    occ2 = Occasion(
        friend_id=friend.id,
        occasion_type="Anniversary",
        title="Priya's Wedding Anniversary",
        date_str="18 October",
        month=10,
        day=18
    )
    db_session.add_all([occ1, occ2])
    db_session.commit()

    assert db_session.query(Occasion).filter(Occasion.friend_id == friend.id).count() == 2


def test_quote_preservation_verbatim():
    """Verify user-provided quote is strictly preserved verbatim in formatted email."""
    original_quote = "Success is built one small step at a time."
    formatted = quote_service.format_quote_email(
        recipient_name="Arun",
        quote_text=original_quote,
        author="Unknown",
        sender_name="Kamalesh"
    )

    # Must contain exact quote string
    assert f'"{original_quote}"' in formatted["body"]
    assert "Hi Arun," in formatted["body"]
    assert "Best wishes,\nKamalesh" in formatted["body"]


def test_gemini_service_functions():
    """Verify all 4 required Gemini service functions."""
    wish = gemini_service.generate_wish("Arun", "Birthday", "Close Friend", "Likes coding", "Friendly")
    assert "subject" in wish and "body" in wish

    subject = gemini_service.generate_subject("Success is built one small step at a time.", "Arun")
    assert len(subject) > 0

    greeting = gemini_service.generate_greeting("Arun", "Close Friend")
    assert greeting == "Hi Arun,"

    intro = gemini_service.generate_email_introduction("Arun", "Close Friend")
    assert len(intro) > 0


def test_duplicate_protection_wishes(db_session):
    """Verify duplicate protection for wishes: unique (friend_id, occasion_name, sent_date)."""
    friend = Friend(name="Divya", email="divya@gmail.com")
    db_session.add(friend)
    db_session.commit()

    today = datetime.date(2026, 10, 1)

    hist1 = EmailHistory(
        recipient_name="Divya",
        recipient_email="divya@gmail.com",
        email_type="WISH",
        friend_id=friend.id,
        occasion_name="Birthday",
        subject="Happy Birthday Divya!",
        body="Have a great day!",
        sent_date=today,
        status="SENT"
    )
    db_session.add(hist1)
    db_session.commit()

    # Attempt second send on same date
    hist2 = EmailHistory(
        recipient_name="Divya",
        recipient_email="divya@gmail.com",
        email_type="WISH",
        friend_id=friend.id,
        occasion_name="Birthday",
        subject="Duplicate birthday email",
        body="Should fail",
        sent_date=today,
        status="PENDING"
    )
    db_session.add(hist2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_duplicate_protection_quotes(db_session):
    """Verify duplicate protection for quotes: unique (quote_schedule_id, recipient_email, sent_date)."""
    q = Quote(quote_text="Every day is a new opportunity.")
    db_session.add(q)
    db_session.commit()

    today = datetime.date(2026, 10, 1)
    sc = QuoteSchedule(quote_id=q.id, send_date=today, send_time="08:00")
    db_session.add(sc)
    db_session.commit()

    hist1 = EmailHistory(
        recipient_name="Rahul",
        recipient_email="rahul@gmail.com",
        email_type="QUOTE",
        quote_id=q.id,
        quote_schedule_id=sc.id,
        subject="Today's Thought",
        body="Every day is a new opportunity.",
        sent_date=today,
        status="SENT"
    )
    db_session.add(hist1)
    db_session.commit()

    # Duplicate send attempt
    hist2 = EmailHistory(
        recipient_name="Rahul",
        recipient_email="rahul@gmail.com",
        email_type="QUOTE",
        quote_id=q.id,
        quote_schedule_id=sc.id,
        subject="Today's Thought",
        body="Duplicate quote",
        sent_date=today,
        status="PENDING"
    )
    db_session.add(hist2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
