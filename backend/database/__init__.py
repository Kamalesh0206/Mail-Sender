from .session import engine, SessionLocal, get_db, get_db_context, init_db
from .models import (
    Base,
    User,
    Friend,
    FriendGroup,
    FriendGroupMember,
    Occasion,
    Quote,
    QuoteSchedule,
    EmailTemplate,
    EmailHistory,
    AppSetting
)

# Backward-compatibility alias
WishHistory = EmailHistory

__all__ = [
    "engine",
    "SessionLocal",
    "get_db",
    "get_db_context",
    "init_db",
    "Base",
    "User",
    "Friend",
    "FriendGroup",
    "FriendGroupMember",
    "Occasion",
    "Quote",
    "QuoteSchedule",
    "EmailTemplate",
    "EmailHistory",
    "WishHistory",
    "AppSetting"
]
