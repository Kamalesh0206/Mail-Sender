"""Generic Occasions & Wishes Router for WishMail AI."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from backend.database.session import get_db
from backend.database.models import Occasion, Friend, AppSetting
from backend.schemas.schemas import OccasionCreate, OccasionUpdate, OccasionResponse
from backend.agents.wish_agent import WishAgent
from backend.services.gemini_service import gemini_service

router = APIRouter(prefix="/occasions", tags=["Wishes & Occasions"])


@router.get("", response_model=List[OccasionResponse])
def get_occasions(
    occasion_type: Optional[str] = Query(None, description="Filter by Birthday, Anniversary, Custom"),
    friend_id: Optional[int] = Query(None, description="Filter by Friend ID"),
    month: Optional[int] = Query(None, description="Filter by Month"),
    db: Session = Depends(get_db)
):
    """Retrieve all generic occasions."""
    query = db.query(Occasion).join(Friend)
    if occasion_type:
        query = query.filter(Occasion.occasion_type == occasion_type)
    if friend_id:
        query = query.filter(Occasion.friend_id == friend_id)
    if month:
        query = query.filter(Occasion.month == month)

    occasions = query.order_by(Occasion.month.asc(), Occasion.day.asc()).all()
    results = []
    for occ in occasions:
        item = OccasionResponse.model_validate(occ)
        item.friend_name = occ.friend.name if occ.friend else None
        item.friend_email = occ.friend.email if occ.friend else None
        results.append(item)
    return results


@router.post("", response_model=OccasionResponse, status_code=status.HTTP_201_CREATED)
def create_occasion(payload: OccasionCreate, db: Session = Depends(get_db)):
    """Create a new generic occasion (Birthday, Anniversary, or Custom Occasion)."""
    friend = db.query(Friend).filter(Friend.id == payload.friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")

    occ = Occasion(
        friend_id=payload.friend_id,
        occasion_type=payload.occasion_type,
        title=payload.title,
        date_str=payload.date_str,
        month=payload.month,
        day=payload.day,
        year=payload.year,
        notes=payload.notes,
        is_active=payload.is_active
    )
    db.add(occ)
    db.commit()
    db.refresh(occ)

    item = OccasionResponse.model_validate(occ)
    item.friend_name = friend.name
    item.friend_email = friend.email
    return item


@router.put("/{occasion_id}", response_model=OccasionResponse)
def update_occasion(occasion_id: int, payload: OccasionUpdate, db: Session = Depends(get_db)):
    """Update an existing occasion."""
    occ = db.query(Occasion).filter(Occasion.id == occasion_id).first()
    if not occ:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Occasion not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(occ, k, v)

    db.commit()
    db.refresh(occ)

    item = OccasionResponse.model_validate(occ)
    item.friend_name = occ.friend.name if occ.friend else None
    item.friend_email = occ.friend.email if occ.friend else None
    return item


@router.delete("/{occasion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_occasion(occasion_id: int, db: Session = Depends(get_db)):
    """Delete an occasion."""
    occ = db.query(Occasion).filter(Occasion.id == occasion_id).first()
    if not occ:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Occasion not found")
    db.delete(occ)
    db.commit()
    return None


@router.post("/scan-now")
def run_scan_now(db: Session = Depends(get_db)):
    """Manually trigger the daily check workflow right now."""
    try:
        results = WishAgent.run_daily_check(db)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Daily scan failed: {str(e)}"
        )


@router.post("/preview")
def preview_wish(
    friend_id: int = Query(...),
    occasion_type: str = Query("Birthday"),
    tone: Optional[str] = Query("Friendly"),
    db: Session = Depends(get_db)
):
    """Generate an on-demand wish preview using Gemini API without sending."""
    friend = db.query(Friend).filter(Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")

    settings_rec = db.query(AppSetting).filter(AppSetting.id == 1).first()
    sender_name = settings_rec.sender_name if settings_rec else "Kamalesh"
    signature = settings_rec.email_signature if settings_rec else "Best wishes,\nKamalesh"

    wish = gemini_service.generate_wish(
        friend_name=friend.name,
        occasion=occasion_type,
        relationship=friend.relationship,
        personal_notes=friend.personal_notes,
        tone=tone or "Friendly",
        sender_name=sender_name,
        signature=signature
    )

    return {
        "friend": {"id": friend.id, "name": friend.name, "email": friend.email},
        "occasion": occasion_type,
        "tone": tone,
        "preview": wish
    }
