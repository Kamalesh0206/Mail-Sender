"""Database Models for the AI Birthday & Wishes Email Agent."""

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
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Friend(Base):
    """Friend model storing contacts, occasions, and personal context."""
    __tablename__ = "friends"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    
    # Occasion details
    # We store month & day separately to make recurrence check ultra fast and reliable
    # regardless of calendar year leap years or missing birth year.
    birth_date = Column(Date, nullable=True)
    birth_month = Column(Integer, nullable=False, index=True)  # 1 - 12
    birth_day = Column(Integer, nullable=False, index=True)    # 1 - 31
    birth_year = Column(Integer, nullable=True)               # e.g. 1995 or None
    
    occasion_type = Column(String(50), default="Birthday", nullable=False)  # Birthday, Anniversary, Work Anniversary, Festival, Custom
    relationship_type = Column(String(50), default="Friend", nullable=False) # Friend, Family, Colleague, Mentor, Best Friend
    personal_notes = Column(Text, nullable=True)              # Context for AI to personalize wish
    preferred_tone = Column(String(50), default="Friendly", nullable=False) # Friendly, Professional, Funny, Emotional, Casual
    
    is_active = Column(Boolean, default=True, nullable=False) # Enable / disable auto wishes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    wishes = relationship("WishHistory", back_populates="friend", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Friend id={self.id} name='{self.name}' occasion='{self.occasion_type}' date={self.birth_month}/{self.birth_day}>"


class WishHistory(Base):
    """Email history and pending approval queue.
    
    Protects against duplicate sends using UniqueConstraint(friend_id, occasion_type, year).
    """
    __tablename__ = "wishes_history"

    id = Column(Integer, primary_key=True, index=True)
    friend_id = Column(Integer, ForeignKey("friends.id", ondelete="CASCADE"), nullable=False, index=True)
    occasion_type = Column(String(50), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    
    recipient_name = Column(String(150), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    tone = Column(String(50), default="Friendly", nullable=False)
    
    generated_subject = Column(String(255), nullable=False)
    generated_body = Column(Text, nullable=False)
    
    # Status: PENDING_APPROVAL, SENT, FAILED, CANCELLED, SKIPPED
    status = Column(String(50), default="PENDING_APPROVAL", nullable=False, index=True)
    
    scheduled_for = Column(Date, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    gmail_message_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    friend = relationship("Friend", back_populates="wishes")

    # Constraint to prevent sending duplicate emails for the same person, occasion, and year
    __table_args__ = (
        UniqueConstraint("friend_id", "occasion_type", "year", name="uq_friend_occasion_year"),
    )

    def __repr__(self):
        return f"<WishHistory id={self.id} friend_id={self.friend_id} status='{self.status}' year={self.year}>"


class AppSetting(Base):
    """Global configuration settings for the Agent."""
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, default=1)
    
    # Gmail OAuth Status & Secure Tokens
    gmail_connected = Column(Boolean, default=False, nullable=False)
    gmail_email = Column(String(255), nullable=True)
    encrypted_refresh_token = Column(Text, nullable=True)
    access_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Agent & Automation Modes
    automation_mode = Column(String(20), default="APPROVAL", nullable=False)  # "APPROVAL" or "AUTO"
    daily_send_time = Column(String(10), default="08:00", nullable=False)     # "HH:MM"
    default_tone = Column(String(50), default="Friendly", nullable=False)
    
    # Sender Profile
    sender_name = Column(String(100), default="Kamalesh", nullable=False)
    email_signature = Column(Text, default="Best wishes,\nKamalesh", nullable=False)
    
    # AI Engine
    ai_model = Column(String(50), default="gemini-2.5-flash", nullable=False)
    is_scheduler_running = Column(Boolean, default=True, nullable=False)
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<AppSetting gmail_connected={self.gmail_connected} mode='{self.automation_mode}'>"
