"""Pydantic Request and Response Schemas for WishMail AI."""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
import datetime


# --- Group Schemas ---
class FriendGroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class FriendGroupCreate(FriendGroupBase):
    pass


class FriendGroupResponse(FriendGroupBase):
    id: int
    created_at: datetime.datetime
    member_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Friend Schemas ---
class FriendBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    birthday: Optional[str] = Field(None, description="e.g. 05 October or YYYY-MM-DD")
    birth_month: Optional[int] = Field(None, ge=1, le=12)
    birth_day: Optional[int] = Field(None, ge=1, le=31)
    birth_year: Optional[int] = Field(None, ge=1900, le=2100)
    
    anniversary: Optional[str] = Field(None, description="e.g. 12 December or YYYY-MM-DD")
    anniversary_month: Optional[int] = Field(None, ge=1, le=12)
    anniversary_day: Optional[int] = Field(None, ge=1, le=31)
    anniversary_year: Optional[int] = Field(None, ge=1900, le=2100)
    
    relationship: str = Field(default="Close Friend")
    personal_notes: Optional[str] = None
    is_active: bool = Field(default=True)
    enable_wishes: bool = Field(default=True)
    enable_quotes: bool = Field(default=True)
    group_ids: Optional[List[int]] = Field(default_factory=list)


class FriendCreate(FriendBase):
    pass


class FriendUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    birthday: Optional[str] = None
    birth_month: Optional[int] = None
    birth_day: Optional[int] = None
    birth_year: Optional[int] = None
    anniversary: Optional[str] = None
    anniversary_month: Optional[int] = None
    anniversary_day: Optional[int] = None
    anniversary_year: Optional[int] = None
    relationship: Optional[str] = None
    personal_notes: Optional[str] = None
    is_active: Optional[bool] = None
    enable_wishes: Optional[bool] = None
    enable_quotes: Optional[bool] = None
    group_ids: Optional[List[int]] = None


class FriendResponse(FriendBase):
    id: int
    groups: Optional[List[str]] = Field(default_factory=list)
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Generic Occasion Schemas ---
class OccasionBase(BaseModel):
    friend_id: int
    occasion_type: str = Field(..., description="Birthday, Anniversary, or Custom Occasion")
    title: str = Field(..., description="e.g. Arun's Birthday")
    date_str: str = Field(..., description="e.g. 05 October")
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    year: Optional[int] = None
    notes: Optional[str] = None
    is_active: bool = Field(default=True)


class OccasionCreate(OccasionBase):
    pass


class OccasionUpdate(BaseModel):
    title: Optional[str] = None
    occasion_type: Optional[str] = None
    date_str: Optional[str] = None
    month: Optional[int] = None
    day: Optional[int] = None
    year: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class OccasionResponse(OccasionBase):
    id: int
    friend_name: Optional[str] = None
    friend_email: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Quotes Schemas ---
class QuoteBase(BaseModel):
    quote_text: str = Field(..., min_length=1, description="Exact user-provided quote")
    author: Optional[str] = None
    category: str = Field(default="General")


class QuoteCreate(QuoteBase):
    pass


class QuoteUpdate(BaseModel):
    quote_text: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None


class QuoteResponse(QuoteBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Quote Scheduling Schemas ---
class QuoteScheduleCreate(BaseModel):
    quote_text: str = Field(..., description="Exact quote text")
    author: Optional[str] = None
    send_date: str = Field(..., description="YYYY-MM-DD")
    send_time: str = Field(default="08:00", description="HH:MM")
    recipient_type: str = Field(default="ALL", description="ALL, GROUP, INDIVIDUAL, MULTIPLE")
    target_group_id: Optional[int] = None
    target_friend_id: Optional[int] = None
    target_recipient_ids: Optional[List[int]] = None
    subject: Optional[str] = Field(default="🌅 Today's Thought")
    personalized_intro: bool = Field(default=True)


class QuickQuoteScheduleRequest(BaseModel):
    quotes_text: str = Field(..., description="Multiple quotes separated by newlines")
    start_date: str = Field(..., description="YYYY-MM-DD")
    send_time: str = Field(default="08:00")
    frequency: str = Field(default="Daily", description="Daily, Weekdays, Weekly, Custom")
    recipient_type: str = Field(default="ALL")
    target_group_id: Optional[int] = None
    target_friend_id: Optional[int] = None
    subject: Optional[str] = Field(default="🌅 Today's Thought")
    personalized_intro: bool = Field(default=True)


class QuoteScheduleResponse(BaseModel):
    id: int
    quote_id: int
    quote_text: str
    author: Optional[str] = None
    send_date: datetime.date
    send_time: str
    recipient_type: str
    target_group_name: Optional[str] = None
    target_friend_name: Optional[str] = None
    subject: str
    personalized_intro: bool
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Bulk Import Preview Schemas ---
class BulkQuoteRowItem(BaseModel):
    row_number: int
    date: Optional[str] = None
    time: Optional[str] = None
    quote: Optional[str] = None
    recipients: Optional[str] = None
    group: Optional[str] = None
    subject: Optional[str] = None
    is_valid: bool
    error: Optional[str] = None


class BulkQuotePreviewResponse(BaseModel):
    total_rows: int
    valid_count: int
    invalid_count: int
    rows: List[BulkQuoteRowItem]


class BulkQuoteConfirmItem(BaseModel):
    date: str
    time: str
    quote: str
    recipients: Optional[str] = None
    group: Optional[str] = None
    subject: Optional[str] = None


class BulkQuoteConfirmRequest(BaseModel):
    valid_rows: List[BulkQuoteConfirmItem]


# --- Email History & Approval Schemas ---
class EmailHistoryResponse(BaseModel):
    id: int
    recipient_name: str
    recipient_email: str
    email_type: str
    occasion_name: Optional[str] = None
    quote_id: Optional[int] = None
    quote_schedule_id: Optional[int] = None
    friend_id: Optional[int] = None
    subject: str
    body: str
    sent_date: datetime.date
    sent_time: Optional[str] = None
    status: str
    gmail_message_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class WishApproveRequest(BaseModel):
    custom_subject: Optional[str] = None
    custom_body: Optional[str] = None


class SendTestEmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: Optional[str] = "WishMail AI Test"
    body: Optional[str] = "This is a test email from WishMail AI. Personal wishes. Meaningful quotes. Automatically delivered."


# --- Settings Schemas ---
class AppSettingsResponse(BaseModel):
    id: int
    gmail_connected: bool
    gmail_email: Optional[str] = None
    timezone: str
    default_send_time: str
    default_wish_tone: str
    auto_send_wishes: bool
    auto_send_quotes: bool
    default_quote_greeting: str
    default_quote_closing: str
    sender_name: str
    email_signature: str
    ai_model: str
    ai_personalization: bool
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class AppSettingsUpdate(BaseModel):
    timezone: Optional[str] = None
    default_send_time: Optional[str] = None
    default_wish_tone: Optional[str] = None
    auto_send_wishes: Optional[bool] = None
    auto_send_quotes: Optional[bool] = None
    default_quote_greeting: Optional[str] = None
    default_quote_closing: Optional[str] = None
    sender_name: Optional[str] = None
    email_signature: Optional[str] = None
    ai_model: Optional[str] = None
    ai_personalization: Optional[bool] = None


# --- Dashboard & Calendar Schemas ---
class TodayScheduleItem(BaseModel):
    id: int
    time: str
    type: str  # Birthday Wish, Anniversary, Quote, Custom Occasion
    recipient: str
    recipient_email: str
    subject: str
    status: str  # Scheduled, Pending, Sent, Failed
    action_id: int  # history_id or schedule_id or occasion_id


class DashboardOverviewResponse(BaseModel):
    todays_wishes_count: int
    todays_quotes_count: int
    upcoming_wishes_count: int
    upcoming_quotes_count: int
    emails_sent_count: int
    pending_approval_count: int
    failed_emails_count: int
    today_schedule: List[TodayScheduleItem]
    gmail_connected: bool
    gmail_email: Optional[str] = None
    auto_send_wishes: bool
    timezone: str


class CalendarEventItem(BaseModel):
    id: str  # e.g. "wish-1" or "quote-5"
    title: str
    date: str  # YYYY-MM-DD
    time: str
    event_type: str  # WISH or QUOTE
    recipient: str
    status: str
    quote_text: Optional[str] = None
    subject: Optional[str] = None
    entity_id: int
