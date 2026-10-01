"""Quotes Module Router for WishMail AI.

Strictly preserves user-provided quotes verbatim.
Supports:
- Add Single Quote & Schedule
- Quick Multi-Quote Text Scheduler
- Excel (.xlsx) / CSV (.csv) Bulk Upload & Validation Preview
- Send Now & Cancel actions
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import datetime
import io
import csv
import openpyxl

from backend.database.session import get_db
from backend.database.models import Quote, QuoteSchedule, Friend, FriendGroup
from backend.schemas.schemas import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteScheduleCreate,
    QuoteScheduleResponse,
    QuickQuoteScheduleRequest,
    BulkQuotePreviewResponse,
    BulkQuoteRowItem,
    BulkQuoteConfirmRequest
)
from backend.services.quote_service import quote_service

router = APIRouter(prefix="/quotes", tags=["Quotes"])


@router.get("", response_model=List[QuoteResponse])
def get_quotes(
    search: Optional[str] = Query(None, description="Search quote text or author"),
    category: Optional[str] = Query(None, description="Filter category"),
    db: Session = Depends(get_db)
):
    """Retrieve all user-provided quotes."""
    query = db.query(Quote)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Quote.quote_text.ilike(search_fmt)) | (Quote.author.ilike(search_fmt)))
    if category:
        query = query.filter(Quote.category == category)
    return query.order_by(Quote.id.desc()).all()


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(payload: QuoteCreate, db: Session = Depends(get_db)):
    """Add a new quote (stored exactly as entered)."""
    quote = Quote(
        quote_text=payload.quote_text.strip(),
        author=payload.author.strip() if payload.author else None,
        category=payload.category
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


@router.put("/{quote_id}", response_model=QuoteResponse)
def update_quote(quote_id: int, payload: QuoteUpdate, db: Session = Depends(get_db)):
    """Update quote text or author."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(quote, k, v)

    db.commit()
    db.refresh(quote)
    return quote


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(quote_id: int, db: Session = Depends(get_db)):
    """Delete a quote and its schedules."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    db.delete(quote)
    db.commit()
    return None


@router.get("/schedules", response_model=List[QuoteScheduleResponse])
def get_quote_schedules(
    status_filter: Optional[str] = Query(None, description="SCHEDULED, SENT, CANCELLED, FAILED"),
    db: Session = Depends(get_db)
):
    """Retrieve scheduled quote broadcasts."""
    query = db.query(QuoteSchedule).join(Quote)
    if status_filter:
        query = query.filter(QuoteSchedule.status == status_filter)

    schedules = query.order_by(QuoteSchedule.send_date.asc(), QuoteSchedule.send_time.asc()).all()
    results = []
    for sc in schedules:
        grp_name = sc.target_group.name if sc.target_group else None
        fr_name = sc.target_friend.name if sc.target_friend else None
        item = QuoteScheduleResponse(
            id=sc.id,
            quote_id=sc.quote_id,
            quote_text=sc.quote.quote_text,
            author=sc.quote.author,
            send_date=sc.send_date,
            send_time=sc.send_time,
            recipient_type=sc.recipient_type,
            target_group_name=grp_name,
            target_friend_name=fr_name,
            subject=sc.subject,
            personalized_intro=sc.personalized_intro,
            status=sc.status,
            created_at=sc.created_at
        )
        results.append(item)
    return results


@router.post("/schedule", response_model=QuoteScheduleResponse, status_code=status.HTTP_201_CREATED)
def schedule_single_quote(payload: QuoteScheduleCreate, db: Session = Depends(get_db)):
    """Schedule a single quote broadcast for a given date and time."""
    # 1. Create or find quote
    quote = Quote(
        quote_text=payload.quote_text.strip(),
        author=payload.author.strip() if payload.author else None
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)

    # 2. Parse date
    try:
        send_date_obj = datetime.date.fromisoformat(payload.send_date)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Expected YYYY-MM-DD.")

    import json
    rec_ids_json = json.dumps(payload.target_recipient_ids) if payload.target_recipient_ids else None

    schedule = QuoteSchedule(
        quote_id=quote.id,
        send_date=send_date_obj,
        send_time=payload.send_time or "08:00",
        recipient_type=payload.recipient_type,
        target_group_id=payload.target_group_id,
        target_friend_id=payload.target_friend_id,
        target_recipient_ids=rec_ids_json,
        subject=payload.subject or "🌅 Today's Thought",
        personalized_intro=payload.personalized_intro,
        status="SCHEDULED"
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    grp_name = db.query(FriendGroup.name).filter(FriendGroup.id == payload.target_group_id).scalar() if payload.target_group_id else None
    fr_name = db.query(Friend.name).filter(Friend.id == payload.target_friend_id).scalar() if payload.target_friend_id else None

    return QuoteScheduleResponse(
        id=schedule.id,
        quote_id=quote.id,
        quote_text=quote.quote_text,
        author=quote.author,
        send_date=schedule.send_date,
        send_time=schedule.send_time,
        recipient_type=schedule.recipient_type,
        target_group_name=grp_name,
        target_friend_name=fr_name,
        subject=schedule.subject,
        personalized_intro=schedule.personalized_intro,
        status=schedule.status,
        created_at=schedule.created_at
    )


@router.post("/quick-schedule")
def quick_schedule_multiple_quotes(payload: QuickQuoteScheduleRequest, db: Session = Depends(get_db)):
    """Schedule multiple quotes pasted by user with automated sequential dates."""
    lines = [q.strip() for q in payload.quotes_text.strip().split("\n") if q.strip()]
    if not lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No quotes provided in text.")

    try:
        curr_date = datetime.date.fromisoformat(payload.start_date)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start date format. Expected YYYY-MM-DD.")

    freq = payload.frequency.lower()
    created_schedules = []

    for quote_str in lines:
        # Create quote
        quote = Quote(quote_text=quote_str)
        db.add(quote)
        db.commit()
        db.refresh(quote)

        # Create schedule
        schedule = QuoteSchedule(
            quote_id=quote.id,
            send_date=curr_date,
            send_time=payload.send_time or "08:00",
            recipient_type=payload.recipient_type,
            target_group_id=payload.target_group_id,
            target_friend_id=payload.target_friend_id,
            subject=payload.subject or "🌅 Today's Thought",
            personalized_intro=payload.personalized_intro,
            status="SCHEDULED"
        )
        db.add(schedule)
        db.commit()
        created_schedules.append({
            "quote": quote_str[:40] + ("..." if len(quote_str) > 40 else ""),
            "date": curr_date.isoformat(),
            "time": schedule.send_time
        })

        # Advance date according to frequency
        if freq == "weekdays":
            curr_date += datetime.timedelta(days=1)
            while curr_date.weekday() >= 5:  # 5=Saturday, 6=Sunday
                curr_date += datetime.timedelta(days=1)
        elif freq == "weekly":
            curr_date += datetime.timedelta(days=7)
        else:  # Daily (default)
            curr_date += datetime.timedelta(days=1)

    return {
        "success": True,
        "count": len(created_schedules),
        "schedules": created_schedules
    }


@router.post("/import-preview", response_model=BulkQuotePreviewResponse)
async def bulk_import_preview(file: UploadFile = File(...)):
    """Upload Excel (.xlsx) or CSV (.csv), validate each row, and return preview."""
    filename = file.filename or ""
    content = await file.read()
    raw_rows = []

    if filename.endswith(".xlsx"):
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = wb.active
            for row in sheet.iter_rows(values_only=True):
                if any(row):
                    raw_rows.append([str(c) if c is not None else "" for c in row])
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read Excel file: {e}")
    else:
        try:
            text = content.decode("utf-8-sig")
            reader = csv.reader(io.StringIO(text))
            for row in reader:
                if any(row):
                    raw_rows.append(row)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read CSV file: {e}")

    if not raw_rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is completely empty.")

    # Skip header row if matches template keywords
    first_row = [str(c).lower().strip() for c in raw_rows[0]]
    start_idx = 1 if any("date" in c or "quote" in c for c in first_row) else 0

    validated_items: List[BulkQuoteRowItem] = []
    valid_count = 0
    invalid_count = 0

    for i in range(start_idx, len(raw_rows)):
        row = raw_rows[i]
        row_num = i + 1
        
        # Expected template: Date | Time | Quote | Recipients | Group | Subject
        date_val = row[0].strip() if len(row) > 0 else ""
        time_val = row[1].strip() if len(row) > 1 else "08:00"
        quote_val = row[2].strip() if len(row) > 2 else ""
        recip_val = row[3].strip() if len(row) > 3 else "ALL"
        group_val = row[4].strip() if len(row) > 4 else ""
        subj_val = row[5].strip() if len(row) > 5 else "🌅 Today's Thought"

        # Validations
        error_msg = None
        if not quote_val:
            error_msg = "Quote text is empty"
        else:
            # Validate date format
            try:
                # Handle possible datetime object string from openpyxl
                if " " in date_val:
                    date_val = date_val.split(" ")[0]
                datetime.date.fromisoformat(date_val)
            except ValueError:
                error_msg = f"Invalid date format '{date_val}' (Expected YYYY-MM-DD)"

        is_valid = error_msg is None
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        validated_items.append(
            BulkQuoteRowItem(
                row_number=row_num,
                date=date_val,
                time=time_val or "08:00",
                quote=quote_val,
                recipients=recip_val,
                group=group_val,
                subject=subj_val,
                is_valid=is_valid,
                error=error_msg
            )
        )

    return BulkQuotePreviewResponse(
        total_rows=len(validated_items),
        valid_count=valid_count,
        invalid_count=invalid_count,
        rows=validated_items
    )


@router.post("/import-confirm")
def bulk_import_confirm(payload: BulkQuoteConfirmRequest, db: Session = Depends(get_db)):
    """Confirm and import all validated quotes into database."""
    imported_count = 0
    for item in payload.valid_rows:
        try:
            date_obj = datetime.date.fromisoformat(item.date)
            quote = Quote(quote_text=item.quote)
            db.add(quote)
            db.commit()
            db.refresh(quote)

            # Determine recipient type and target group if any
            target_group_id = None
            recip_type = "ALL"
            if item.group and item.group.strip():
                grp = db.query(FriendGroup).filter(FriendGroup.name.ilike(item.group.strip())).first()
                if grp:
                    target_group_id = grp.id
                    recip_type = "GROUP"

            schedule = QuoteSchedule(
                quote_id=quote.id,
                send_date=date_obj,
                send_time=item.time or "08:00",
                recipient_type=recip_type,
                target_group_id=target_group_id,
                subject=item.subject or "🌅 Today's Thought",
                status="SCHEDULED"
            )
            db.add(schedule)
            db.commit()
            imported_count += 1
        except Exception:
            db.rollback()

    return {"success": True, "imported_count": imported_count}


@router.post("/{schedule_id}/send-now")
def send_quote_now(schedule_id: int, db: Session = Depends(get_db)):
    """Immediately dispatch a scheduled quote broadcast."""
    schedule = db.query(QuoteSchedule).filter(QuoteSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    result = quote_service.dispatch_quote_schedule(db, schedule, force_send=True)
    return {"success": True, "result": result}


@router.post("/{schedule_id}/cancel")
def cancel_quote_schedule(schedule_id: int, db: Session = Depends(get_db)):
    """Cancel a scheduled quote."""
    schedule = db.query(QuoteSchedule).filter(QuoteSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    schedule.status = "CANCELLED"
    db.commit()
    return {"success": True, "message": "Quote schedule cancelled"}


@router.get("/template")
def download_quote_template():
    """Download the standard CSV template for bulk quote upload."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Time", "Quote", "Recipients", "Group", "Subject"])
    writer.writerow(["2026-10-05", "08:00", "Success is built one small step at a time.", "ALL", "", "Good Morning"])
    writer.writerow(["2026-10-06", "08:00", "Every day is a new opportunity to become better.", "", "Close Friends", "Daily Thought"])
    writer.writerow(["2026-10-07", "08:00", "Happiness is not by chance, but by choice.", "Arun,Priya", "", "Motivation"])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wishmail_quotes_template.csv"}
    )
