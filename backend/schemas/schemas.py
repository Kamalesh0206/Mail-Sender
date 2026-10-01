"""Pydantic Request and Response Schemas."""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
import datetime


# --- Friend Schemas ---
class FriendBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, example="Arun Kumar")
    email: EmailStr = Field(..., example="arun@example.com")
    birth_date: Optional[str] = Field(None, example="1995-10-05", description="Full birth date YYYY-MM-DD or MM-DD")
    birth_month: int = Field(..., ge=1, le=12, example=10)
    birth_day: int = Field(..., ge=1, le=31, example=5)
    birth_year: Optional[int] = Field(None, ge=1900, le=2100, example=1995)
    occasion_type: str = Field(default="Birthday", example="Birthday")
    relationship_type: str = Field(default="Friend", example="Colleague")
    personal_notes: Optional[str] = Field(None, example="Loves hiking, specialty coffee, and tech gadgets.")
    preferred_tone: str = Field(default="Friendly", example="Friendly")
    is_active: bool = Field(default=True)

    @field_validator("preferred_tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        valid_tones = ["Friendly", "Professional", "Funny", "Emotional", "Casual"]
        v_title = v.title()
        if v_title not in valid_tones:
            return "Friendly"
        return v_title


class FriendCreate(FriendBase):
    pass


class FriendUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    birth_date: Optional[str] = None
    birth_month: Optional[int] = Field(None, ge=1, le=12)
    birth_day: Optional[int] = Field(None, ge=1, le=31)
    birth_year: Optional[int] = Field(None, ge=1900, le=2100)
    occasion_type: Optional[str] = None
    relationship_type: Optional[str] = None
    personal_notes: Optional[str] = None
    preferred_tone: Optional[str] = None
    is_active: Optional[bool] = None


class FriendResponse(FriendBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Wish & History Schemas ---
class WishHistoryResponse(BaseModel):
    id: int
    friend_id: int
    occasion_type: str
    year: int
    recipient_name: str
    recipient_email: str
    tone: str
    generated_subject: str
    generated_body: str
    status: str
    scheduled_for: datetime.date
    sent_at: Optional[datetime.datetime] = None
    gmail_message_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class WishApproveRequest(BaseModel):
    custom_subject: Optional[str] = None
    custom_body: Optional[str] = None


class WishRegenerateRequest(BaseModel):
    tone: Optional[str] = None
    custom_instructions: Optional[str] = None


class ManualWishGenerateRequest(BaseModel):
    friend_id: int
    tone: Optional[str] = None
    custom_instructions: Optional[str] = None


# --- Settings Schemas ---
class AppSettingsResponse(BaseModel):
    id: int
    gmail_connected: bool
    gmail_email: Optional[str] = None
    automation_mode: str
    daily_send_time: str
    default_tone: str
    sender_name: str
    email_signature: str
    ai_model: str
    is_scheduler_running: bool
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class AppSettingsUpdate(BaseModel):
    automation_mode: Optional[str] = Field(None, example="APPROVAL")  # APPROVAL or AUTO
    daily_send_time: Optional[str] = Field(None, example="08:00")
    default_tone: Optional[str] = Field(None, example="Friendly")
    sender_name: Optional[str] = Field(None, example="Kamalesh")
    email_signature: Optional[str] = Field(None, example="Best wishes,\nKamalesh")
    ai_model: Optional[str] = Field(None, example="gemini-2.5-flash")
    is_scheduler_running: Optional[bool] = None


class SendTestEmailRequest(BaseModel):
    recipient_email: EmailStr = Field(..., example="test@example.com")
    subject: Optional[str] = Field(default="Test Birthday Wish from AI Wishes Agent")
    body: Optional[str] = Field(default="This is a test email sent to verify your Gmail API integration. Everything is operating perfectly! 🎉")


# --- Stats & Dashboard Schemas ---
class UpcomingOccasion(BaseModel):
    friend_id: int
    name: str
    email: str
    occasion_type: str
    relationship_type: str
    month: int
    day: int
    year: Optional[int] = None
    days_until: int
    target_date: str
    formatted_date: str


class DashboardStatsResponse(BaseModel):
    todays_count: int
    upcoming_count: int
    sent_count: int
    pending_count: int
    failed_count: int
    total_friends: int
    automation_mode: str
    gmail_connected: bool
    gmail_email: Optional[str] = None
