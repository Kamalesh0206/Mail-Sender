"""Dashboard Metrics and Today's Schedule Router for WishMail AI."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import datetime
import pytz

from backend.database.session import get_db
from backend.database.models import Occasion, Friend, QuoteSchedule, EmailHistory, AppSetting
from backend.schemas.schemas import DashboardOverviewResponse, TodayScheduleItem

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardOverviewResponse)
def get_dashboard_overview(db: Session = Depends(get_db)):
    """Retrieve all high-level dashboard cards and Today's Schedule."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    tz_name = setting.timezone if setting else "Asia/Kolkata"
    
    try:
        tz = pytz.timezone(tz_name)
        now_tz = datetime.datetime.now(tz)
    except Exception:
        tz = pytz.timezone("Asia/Kolkata")
        now_tz = datetime.datetime.now(tz)

    today = now_tz.date()

    # 1. Today's Wishes count (Occasions occurring today)
    todays_wishes_count = db.query(Occasion).join(Friend).filter(
        Occasion.is_active == True,
        Occasion.month == today.month,
        Occasion.day == today.day,
        Friend.is_active == True,
        Friend.enable_wishes == True
    ).count()

    # 2. Today's Quotes count (QuoteSchedules set for today)
    todays_quotes_count = db.query(QuoteSchedule).filter(
        QuoteSchedule.send_date == today
    ).count()

    # 3. Upcoming Wishes in next 30 days
    # Check friends occasions
    all_occasions = db.query(Occasion).join(Friend).filter(
        Occasion.is_active == True,
        Friend.is_active == True,
        Friend.enable_wishes == True
    ).all()
    upcoming_wishes_count = 0
    for occ in all_occasions:
        try:
            target = datetime.date(today.year, occ.month, occ.day)
            if target < today:
                target = datetime.date(today.year + 1, occ.month, occ.day)
            days = (target - today).days
            if 0 < days <= 30:
                upcoming_wishes_count += 1
        except ValueError:
            pass

    # 4. Upcoming Quotes in next 30 days
    upcoming_quotes_count = db.query(QuoteSchedule).filter(
        QuoteSchedule.send_date > today,
        QuoteSchedule.send_date <= today + datetime.timedelta(days=30),
        QuoteSchedule.status == "SCHEDULED"
    ).count()

    # 5. Total Emails Sent
    emails_sent_count = db.query(EmailHistory).filter(EmailHistory.status == "SENT").count()

    # 6. Total Pending Approvals
    pending_approval_count = db.query(EmailHistory).filter(EmailHistory.status == "PENDING").count()

    # 7. Total Failed Emails
    failed_emails_count = db.query(EmailHistory).filter(EmailHistory.status == "FAILED").count()

    # 8. TODAY'S SCHEDULE TABLE: Time | Type | Recipient | Status
    today_schedule: List[TodayScheduleItem] = []

    # Add today's occasions
    todays_occ_list = db.query(Occasion).join(Friend).filter(
        Occasion.is_active == True,
        Occasion.month == today.month,
        Occasion.day == today.day,
        Friend.is_active == True
    ).all()

    for occ in todays_occ_list:
        # Check history status
        hist = db.query(EmailHistory).filter(
            EmailHistory.friend_id == occ.friend_id,
            EmailHistory.occasion_name == occ.occasion_type,
            EmailHistory.sent_date == today
        ).first()

        status_str = "Scheduled"
        action_id = occ.id
        subj = f"Happy {occ.occasion_type}, {occ.friend.name}! 🎉"
        if hist:
            status_str = hist.status.capitalize()
            action_id = hist.id
            subj = hist.subject

        time_display = "08:00 AM"
        if hist and hist.sent_time:
            time_display = hist.sent_time

        today_schedule.append(
            TodayScheduleItem(
                id=occ.id,
                time=time_display,
                type=f"{occ.occasion_type} Wish",
                recipient=occ.friend.name,
                recipient_email=occ.friend.email,
                subject=subj,
                status=status_str,
                action_id=action_id
            )
        )

    # Add today's scheduled quotes
    todays_quote_list = db.query(QuoteSchedule).filter(
        QuoteSchedule.send_date == today
    ).all()

    for qs in todays_quote_list:
        recip_display = "All Friends"
        if qs.recipient_type == "GROUP" and qs.target_group:
            recip_display = f"{qs.target_group.name}"
        elif qs.recipient_type == "INDIVIDUAL" and qs.target_friend:
            recip_display = qs.target_friend.name

        status_str = qs.status.capitalize()
        today_schedule.append(
            TodayScheduleItem(
                id=qs.id,
                time=qs.send_time,
                type="Quote",
                recipient=recip_display,
                recipient_email="Broadcast",
                subject=qs.subject,
                status=status_str,
                action_id=qs.id
            )
        )

    # Sort today schedule by time
    today_schedule.sort(key=lambda x: x.time)

    return DashboardOverviewResponse(
        todays_wishes_count=todays_wishes_count,
        todays_quotes_count=todays_quotes_count,
        upcoming_wishes_count=upcoming_wishes_count,
        upcoming_quotes_count=upcoming_quotes_count,
        emails_sent_count=emails_sent_count,
        pending_approval_count=pending_approval_count,
        failed_emails_count=failed_emails_count,
        today_schedule=today_schedule,
        gmail_connected=bool(setting.gmail_connected) if setting else False,
        gmail_email=setting.gmail_email if setting else None,
        auto_send_wishes=bool(setting.auto_send_wishes) if setting else False,
        timezone=tz_name
    )
