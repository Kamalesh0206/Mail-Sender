"""Occasion Handlers and Strategy Registry.

Provides an extensible plug-and-play architecture for:
- Birthday wishes (fully implemented)
- Anniversary wishes
- Festival wishes
- Work anniversary wishes
- Custom occasions
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Type
import datetime


class BaseOccasionHandler(ABC):
    """Abstract base class for all occasion types."""

    occasion_key: str = "Base"
    display_name: str = "Occasion"

    @abstractmethod
    def matches_date(self, friend_month: int, friend_day: int, target_date: datetime.date) -> bool:
        """Determine if this occasion matches the target date."""
        pass

    @abstractmethod
    def format_celebration_title(self, friend_name: str, birth_year: Optional[int], target_date: datetime.date) -> str:
        """Generate a contextual title or milestone (e.g. 30th Birthday, 5th Work Anniversary)."""
        pass

    @abstractmethod
    def get_prompt_guidance(self, relationship: str, tone: str) -> str:
        """Provide occasion-specific nuances to the Gemini AI prompt."""
        pass


class BirthdayOccasionHandler(BaseOccasionHandler):
    """Handler for Birthday celebrations."""

    occasion_key: str = "Birthday"
    display_name: str = "Birthday"

    def matches_date(self, friend_month: int, friend_day: int, target_date: datetime.date) -> bool:
        return friend_month == target_date.month and friend_day == target_date.day

    def format_celebration_title(self, friend_name: str, birth_year: Optional[int], target_date: datetime.date) -> str:
        if birth_year and birth_year > 1900 and birth_year < target_date.year:
            age = target_date.year - birth_year
            return f"{friend_name}'s {age}th Birthday"
        return f"{friend_name}'s Birthday"

    def get_prompt_guidance(self, relationship: str, tone: str) -> str:
        return (
            "Focus on celebrating their life, accomplishments, bringing good health, joy, "
            "and wishing an inspiring new chapter for the upcoming year."
        )


class AnniversaryOccasionHandler(BaseOccasionHandler):
    """Handler for Wedding / Relationship Anniversaries."""

    occasion_key: str = "Anniversary"
    display_name: str = "Anniversary"

    def matches_date(self, friend_month: int, friend_day: int, target_date: datetime.date) -> bool:
        return friend_month == target_date.month and friend_day == target_date.day

    def format_celebration_title(self, friend_name: str, birth_year: Optional[int], target_date: datetime.date) -> str:
        if birth_year and birth_year < target_date.year:
            years = target_date.year - birth_year
            return f"{friend_name}'s {years}th Anniversary"
        return f"{friend_name}'s Anniversary"

    def get_prompt_guidance(self, relationship: str, tone: str) -> str:
        return (
            "Celebrate partnership, love, enduring companionship, and cherished milestones. "
            "Congratulate both partners on their journey together."
        )


class WorkAnniversaryOccasionHandler(BaseOccasionHandler):
    """Handler for Professional Work Anniversaries."""

    occasion_key: str = "Work Anniversary"
    display_name: str = "Work Anniversary"

    def matches_date(self, friend_month: int, friend_day: int, target_date: datetime.date) -> bool:
        return friend_month == target_date.month and friend_day == target_date.day

    def format_celebration_title(self, friend_name: str, birth_year: Optional[int], target_date: datetime.date) -> str:
        if birth_year and birth_year < target_date.year:
            years = target_date.year - birth_year
            return f"{friend_name}'s {years} Year Work Anniversary"
        return f"{friend_name}'s Work Anniversary"

    def get_prompt_guidance(self, relationship: str, tone: str) -> str:
        return (
            "Acknowledge their professional dedication, impact, leadership, and accomplishments. "
            "Highlight teamwork and exciting future career milestones."
        )


class FestivalOccasionHandler(BaseOccasionHandler):
    """Handler for Seasonal / Cultural Festivals."""

    occasion_key: str = "Festival"
    display_name: str = "Festival"

    def matches_date(self, friend_month: int, friend_day: int, target_date: datetime.date) -> bool:
        return friend_month == target_date.month and friend_day == target_date.day

    def format_celebration_title(self, friend_name: str, birth_year: Optional[int], target_date: datetime.date) -> str:
        return f"Festive Greetings for {friend_name}"

    def get_prompt_guidance(self, relationship: str, tone: str) -> str:
        return (
            "Convey warmth, peace, prosperity, light, and festive cheer for their home and family."
        )


class CustomOccasionHandler(BaseOccasionHandler):
    """Handler for User-Defined Custom Milestones."""

    occasion_key: str = "Custom"
    display_name: str = "Custom Occasion"

    def matches_date(self, friend_month: int, friend_day: int, target_date: datetime.date) -> bool:
        return friend_month == target_date.month and friend_day == target_date.day

    def format_celebration_title(self, friend_name: str, birth_year: Optional[int], target_date: datetime.date) -> str:
        return f"Special Occasion for {friend_name}"

    def get_prompt_guidance(self, relationship: str, tone: str) -> str:
        return (
            "Tailor the message to the personal notes and context provided for this special milestone."
        )


# Strategy Registry
OCCASION_HANDLERS: Dict[str, BaseOccasionHandler] = {
    "Birthday": BirthdayOccasionHandler(),
    "Anniversary": AnniversaryOccasionHandler(),
    "Work Anniversary": WorkAnniversaryOccasionHandler(),
    "Festival": FestivalOccasionHandler(),
    "Custom": CustomOccasionHandler()
}


def get_occasion_handler(occasion_type: str) -> BaseOccasionHandler:
    """Retrieve the handler for a given occasion type, defaulting to Birthday."""
    return OCCASION_HANDLERS.get(occasion_type, OCCASION_HANDLERS["Birthday"])


def get_supported_occasions() -> List[str]:
    """Return all supported occasion keys."""
    return list(OCCASION_HANDLERS.keys())
