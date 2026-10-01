"""Calendar Aggregator Router for WishMail AI."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from backend.database.session import get_db
from backend.database.models import QuoteSchedule, Occasion, Friend, EmailHistory
from backend.schemas.schemas import CalendarEventItem

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("", response_model=List[CalendarEventItem])
def get_calendar_events(
    year: int = Query(default=2026),
    month: int = Query(default=10),
    db: Session = Depends(get_db)
):
    """Retrieve all scheduled quotes and occasion wishes for the specified month."""
    events: List[CalendarEventItem] = []

    # 1. Fetch Scheduled Quotes for this month
    try:
        start_date = datetime.date(year, month, 1)
        # End date of month
        if month == 12:
            end_date = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
        else:
            end_date = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)
    except ValueError:
        start_date = datetime.date.today().replace(day=1)
        end_date = start_date + datetime.timedelta(days=30)

    schedules = db.query(QuoteSchedule).filter(
        QuoteSchedule.send_date >= start_date,
        QuoteSchedule.send_date <= end_date
    ).all()

    for sc in schedules:
        recip_label = sc.recipient_type
        if sc.target_group:
            recip_label = f"Group: {sc.target_group.name}"
        elif sc.target_friend:
            recip_label = sc.target_friend.name

        events.append(
            CalendarEventItem(
                id=f"quote-{sc.id}",
                title=f"Quote: {sc.quote.quote_text[:35]}...",
                date=sc.send_date.isoformat(),
                time=sc.send_time,
                event_type="QUOTE",
                recipient=recip_label,
                status=sc.status,
                quote_text=sc.quote.quote_text,
                subject=sc.subject,
                entity_id=sc.id
            )
        )

    # 2. Fetch Occasions occurring in this month
    occasions = db.query(Occasion).join(Friend).filter(
        Occasion.month == month,
        Occasion.is_active == True,
        Friend.is_active == True
    ).all()

    for occ in occasions:
        try:
            occ_date = datetime.date(year, occ.month, occ.day)
            
            # Check if wish was already sent or pending
            history = db.query(EmailHistory).filter(
                EmailHistory.friend_id == occ.friend_id,
                EmailHistory.occasion_name == occ.occasion_type,
                EmailHistory.sent_date == occ_date
            ).first()

            status_str = history.status if history else "Scheduled"

            events.append(
                CalendarEventItem(
                    id=f"wish-{occ.id}",
                    title=f"{occ.friend.name} - {occ.occasion_type}",
                    date=occ_date.isoformat(),
                    time="08:00",
                    event_type="WISH",
                    recipient=occ.friend.name,
                    status=status_str,
                    subject=f"Happy {occ.occasion_type}, {occ.friend.name}!",
                    entity_id=occ.id
                )
            )
        except ValueError:
            continue

    events.sort(key=lambda x: (x.date, x.time))
    return events
