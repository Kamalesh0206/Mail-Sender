"""Database Models for WishMail AI — AI Wishes & Quotes Email Agent."""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import declarative_base, relationship as orm_relationship

Base = declarative_base()


class User(Base):
    """User account model."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class FriendGroupMember(Base):
    """Junction table connecting Friends to Friend Groups."""
    __tablename__ = "friend_group_members"

    id = Column(Integer, primary_key=True, index=True)
    friend_id = Column(Integer, ForeignKey("friends.id", ondelete="CASCADE"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("friend_groups.id", ondelete="CASCADE"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("friend_id", "group_id", name="uq_friend_group"),
    )


class FriendGroup(Base):
    """Friend Groups (e.g. Close Friends, College Friends, Office Friends, Family, All Friends)."""
    __tablename__ = "friend_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    memberships = orm_relationship("FriendGroupMember", backref="group", cascade="all, delete-orphan")


class Friend(Base):
    """Friend profile storing occasion dates, relationship context, and preferences."""
    __tablename__ = "friends"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Birthday details
    birthday = Column(String(50), nullable=True)      # e.g. "05 October"
    birth_month = Column(Integer, nullable=True, index=True)
    birth_day = Column(Integer, nullable=True, index=True)
    birth_year = Column(Integer, nullable=True)
    
    # Anniversary details
    anniversary = Column(String(50), nullable=True)   # e.g. "12 December"
    anniversary_month = Column(Integer, nullable=True, index=True)
    anniversary_day = Column(Integer, nullable=True, index=True)
    anniversary_year = Column(Integer, nullable=True)
    
    relationship = Column(String(100), default="Close Friend", nullable=False) # Close Friend, College Friends, Family, Colleague, Mentor
    personal_notes = Column(Text, nullable=True)
    
    # Status and Channel Preferences
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    enable_wishes = Column(Boolean, default=True, nullable=False)
    enable_quotes = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    group_memberships = orm_relationship("FriendGroupMember", backref="friend", cascade="all, delete-orphan")
    occasions = orm_relationship("Occasion", back_populates="friend", cascade="all, delete-orphan")
    email_history = orm_relationship("EmailHistory", back_populates="friend", cascade="all, delete-orphan")


class Occasion(Base):
    """Generic Occasion model supporting Birthday, Anniversary, and Custom Occasion."""
    __tablename__ = "occasions"

    id = Column(Integer, primary_key=True, index=True)
    friend_id = Column(Integer, ForeignKey("friends.id", ondelete="CASCADE"), nullable=False, index=True)
    occasion_type = Column(String(50), nullable=False, index=True)  # Birthday, Anniversary, Custom Occasion
    title = Column(String(150), nullable=False)                    # e.g. "Arun's Birthday"
    date_str = Column(String(50), nullable=False)                  # e.g. "05 October"
    month = Column(Integer, nullable=False, index=True)            # 1 - 12
    day = Column(Integer, nullable=False, index=True)              # 1 - 31
    year = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    friend = orm_relationship("Friend", back_populates="occasions")


class Quote(Base):
    """User-provided quotes. Stored exactly as entered without modification."""
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    quote_text = Column(Text, nullable=False)                      # EXACT quote text
    author = Column(String(150), nullable=True)
    category = Column(String(100), default="General", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    schedules = orm_relationship("QuoteSchedule", back_populates="quote", cascade="all, delete-orphan")


class QuoteSchedule(Base):
    """Scheduled Quote broadcasts."""
    __tablename__ = "quote_schedules"

    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    send_date = Column(Date, nullable=False, index=True)
    send_time = Column(String(10), default="08:00", nullable=False)  # HH:MM
    
    # Recipient targeting: ALL, GROUP, INDIVIDUAL, MULTIPLE
    recipient_type = Column(String(50), default="ALL", nullable=False)
    target_group_id = Column(Integer, ForeignKey("friend_groups.id", ondelete="SET NULL"), nullable=True)
    target_friend_id = Column(Integer, ForeignKey("friends.id", ondelete="SET NULL"), nullable=True)
    target_recipient_ids = Column(Text, nullable=True)              # JSON string for multiple friend IDs
    
    subject = Column(String(255), default="🌅 Today's Thought", nullable=False)
    personalized_intro = Column(Boolean, default=True, nullable=False)
    
    # Status: SCHEDULED, PENDING_APPROVAL, SENT, CANCELLED, FAILED
    status = Column(String(50), default="SCHEDULED", nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    quote = orm_relationship("Quote", back_populates="schedules")
    target_group = orm_relationship("FriendGroup")
    target_friend = orm_relationship("Friend")


class EmailTemplate(Base):
    """Reusable email formatting templates for Wishes and Quotes."""
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    template_type = Column(String(50), nullable=False)             # WISH or QUOTE
    greeting = Column(String(150), default="Hi {{friend_name}},", nullable=False)
    body_structure = Column(Text, nullable=False)
    closing = Column(String(150), default="Have a great day!", nullable=False)
    signature = Column(String(150), default="Best wishes,\n{{sender_name}}", nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)


class EmailHistory(Base):
    """Comprehensive email audit history and approval queue."""
    __tablename__ = "email_history"

    id = Column(Integer, primary_key=True, index=True)
    recipient_name = Column(String(150), nullable=False)
    recipient_email = Column(String(255), nullable=False, index=True)
    email_type = Column(String(20), nullable=False, index=True)     # WISH or QUOTE
    
    # For Wishes:
    occasion_id = Column(Integer, ForeignKey("occasions.id", ondelete="SET NULL"), nullable=True)
    occasion_name = Column(String(100), nullable=True)
    
    # For Quotes:
    quote_id = Column(Integer, ForeignKey("quotes.id", ondelete="SET NULL"), nullable=True)
    quote_schedule_id = Column(Integer, ForeignKey("quote_schedules.id", ondelete="SET NULL"), nullable=True)
    
    friend_id = Column(Integer, ForeignKey("friends.id", ondelete="SET NULL"), nullable=True, index=True)
    
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    
    sent_date = Column(Date, nullable=False, index=True)
    sent_time = Column(String(20), nullable=True)
    
    # Statuses: PENDING, APPROVED, SENDING, SENT, FAILED, CANCELLED
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    
    gmail_message_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    friend = orm_relationship("Friend", back_populates="email_history")
    occasion = orm_relationship("Occasion")
    quote = orm_relationship("Quote")
    quote_schedule = orm_relationship("QuoteSchedule")

    # Duplicate Protection Constraints:
    # 1. For Wishes: Unique (friend_id, occasion_id, sent_date)
    # 2. For Quotes: Unique (quote_schedule_id, recipient_email, sent_date)
    __table_args__ = (
        UniqueConstraint("friend_id", "occasion_name", "sent_date", name="uq_wish_friend_occasion_date"),
        UniqueConstraint("quote_schedule_id", "recipient_email", "sent_date", name="uq_quote_schedule_recipient_date"),
    )


class AppSetting(Base):
    """Global configuration settings for WishMail AI."""
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, default=1)
    
    # Gmail OAuth Status & Secure Tokens
    gmail_connected = Column(Boolean, default=False, nullable=False)
    gmail_email = Column(String(255), nullable=True)
    encrypted_refresh_token = Column(Text, nullable=True)
    access_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Localization & Timing
    timezone = Column(String(100), default="Asia/Kolkata", nullable=False)
    default_send_time = Column(String(10), default="08:00", nullable=False)  # HH:MM
    
    # Wish Settings
    default_wish_tone = Column(String(50), default="Friendly", nullable=False) # Friendly, Casual, Emotional, Funny, Professional
    auto_send_wishes = Column(Boolean, default=False, nullable=False)         # False = APPROVAL MODE, True = AUTO SEND MODE
    
    # Quote Settings
    auto_send_quotes = Column(Boolean, default=True, nullable=False)
    default_quote_greeting = Column(String(150), default="Hi {{friend_name}},", nullable=False)
    default_quote_closing = Column(String(150), default="Have a great day!", nullable=False)
    
    # Sender Profile
    sender_name = Column(String(100), default="Kamalesh", nullable=False)
    email_signature = Column(Text, default="Best wishes,\nKamalesh", nullable=False)
    
    # AI Engine
    ai_model = Column(String(50), default="gemini-2.5-flash", nullable=False)
    ai_personalization = Column(Boolean, default=True, nullable=False)
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
