"""Dashboard Analytics and Today's Occasion Summaries."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import datetime

from backend.database.session import get_db
from backend.database.models import Friend, WishHistory, AppSetting
from backend.schemas.schemas import DashboardStatsResponse, UpcomingOccasion

router = APIRouter(prefix="/stats", tags=["Dashboard & Analytics"])


@router.get("/summary", response_model=DashboardStatsResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Retrieve high-level counters for the main dashboard cards."""
    today = datetime.date.today()
    current_year = today.year

    # 1. Total active friends
    total_friends = db.query(Friend).filter(Friend.is_active == True).count()

    # 2. Today's birthdays / occasions
    todays_count = db.query(Friend).filter(
        Friend.is_active == True,
        Friend.birth_month == today.month,
        Friend.birth_day == today.day
    ).count()

    # 3. Sent emails count
    sent_count = db.query(WishHistory).filter(WishHistory.status == "SENT").count()

    # 4. Pending approvals count
    pending_count = db.query(WishHistory).filter(WishHistory.status == "PENDING_APPROVAL").count()

    # 5. Failed emails count
    failed_count = db.query(WishHistory).filter(WishHistory.status == "FAILED").count()

    # 6. Upcoming in next 30 days
    upcoming_list = get_upcoming_occasions(limit=100, db=db)
    upcoming_count = len(upcoming_list)

    # App Settings
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()

    return DashboardStatsResponse(
        todays_count=todays_count,
        upcoming_count=upcoming_count,
        sent_count=sent_count,
        pending_count=pending_count,
        failed_count=failed_count,
        total_friends=total_friends,
        automation_mode=setting.automation_mode if setting else "APPROVAL",
        gmail_connected=bool(setting.gmail_connected) if setting else False,
        gmail_email=setting.gmail_email if setting else None
    )


@router.get("/today")
def get_todays_details(db: Session = Depends(get_db)):
    """Retrieve detailed list of friends celebrating today and their wish status."""
    today = datetime.date.today()
    current_year = today.year

    friends_today = db.query(Friend).filter(
        Friend.is_active == True,
        Friend.birth_month == today.month,
        Friend.birth_day == today.day
    ).all()

    results = []
    for friend in friends_today:
        wish = db.query(WishHistory).filter(
            WishHistory.friend_id == friend.id,
            WishHistory.occasion_type == friend.occasion_type,
            WishHistory.year == current_year
        ).first()

        status_label = "NOT_STARTED"
        wish_id = None
        if wish:
            status_label = wish.status
            wish_id = wish.id

        results.append({
            "friend_id": friend.id,
            "name": friend.name,
            "email": friend.email,
            "occasion_type": friend.occasion_type,
            "relationship_type": friend.relationship_type,
            "preferred_tone": friend.preferred_tone,
            "status": status_label,
            "wish_id": wish_id,
            "subject": wish.generated_subject if wish else None,
            "sent_at": wish.sent_at.isoformat() if (wish and wish.sent_at) else None
        })

    return results


@router.get("/upcoming", response_model=List[UpcomingOccasion])
def get_upcoming_occasions(limit: int = 15, db: Session = Depends(get_db)):
    """Retrieve occasions happening in the upcoming 30 days sorted by days remaining."""
    today = datetime.date.today()
    current_year = today.year

    friends = db.query(Friend).filter(Friend.is_active == True).all()
    upcoming = []

    for friend in friends:
        # Determine target date for current year or next year
        try:
            target_this_year = datetime.date(current_year, friend.birth_month, friend.birth_day)
        except ValueError:
            # Handle Feb 29 on non-leap year
            target_this_year = datetime.date(current_year, 2, 28)

        if target_this_year < today:
            try:
                target_date = datetime.date(current_year + 1, friend.birth_month, friend.birth_day)
            except ValueError:
                target_date = datetime.date(current_year + 1, 2, 28)
        else:
            target_date = target_this_year

        days_until = (target_date - today).days

        # Exclude today (days_until == 0 is in Today's list) and keep up to 30 days
        if 0 < days_until <= 30:
            formatted_date = target_date.strftime("%b %d")
            upcoming.append(
                UpcomingOccasion(
                    friend_id=friend.id,
                    name=friend.name,
                    email=friend.email,
                    occasion_type=friend.occasion_type,
                    relationship_type=friend.relationship_type,
                    month=friend.birth_month,
                    day=friend.birth_day,
                    year=friend.birth_year,
                    days_until=days_until,
                    target_date=target_date.isoformat(),
                    formatted_date=formatted_date
                )
            )

    upcoming.sort(key=lambda x: x.days_until)
    return upcoming[:limit]
