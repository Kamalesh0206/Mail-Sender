"""Wishes, Approvals, and Email Delivery Endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import datetime

from backend.database.session import get_db
from backend.database.models import WishHistory, Friend, AppSetting
from backend.schemas.schemas import (
    WishHistoryResponse,
    WishApproveRequest,
    WishRegenerateRequest,
    ManualWishGenerateRequest
)
from backend.agents.wish_agent import WishAgent
from backend.services.gemini_service import gemini_service
from backend.agents.occasions import get_occasion_handler

router = APIRouter(prefix="/wishes", tags=["Wishes & Approvals"])


@router.get("/pending", response_model=List[WishHistoryResponse])
def get_pending_wishes(db: Session = Depends(get_db)):
    """Retrieve all wishes currently waiting for user approval."""
    return db.query(WishHistory).filter(
        WishHistory.status == "PENDING_APPROVAL"
    ).order_by(WishHistory.scheduled_for.desc(), WishHistory.id.desc()).all()


@router.get("/history", response_model=List[WishHistoryResponse])
def get_wishes_history(
    status_filter: Optional[str] = Query(None, description="Filter by status (SENT, FAILED, PENDING_APPROVAL, CANCELLED)"),
    occasion: Optional[str] = Query(None, description="Filter by occasion"),
    year: Optional[int] = Query(None, description="Filter by year"),
    search: Optional[str] = Query(None, description="Search recipient name or email"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve history of all sent, pending, and failed wishes."""
    query = db.query(WishHistory)

    if status_filter:
        query = query.filter(WishHistory.status == status_filter)
    if occasion:
        query = query.filter(WishHistory.occasion_type == occasion)
    if year:
        query = query.filter(WishHistory.year == year)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (WishHistory.recipient_name.ilike(search_fmt)) |
            (WishHistory.recipient_email.ilike(search_fmt)) |
            (WishHistory.generated_subject.ilike(search_fmt))
        )

    return query.order_by(WishHistory.id.desc()).limit(limit).all()


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


@router.post("/{wish_id}/approve")
def approve_and_send_wish(
    wish_id: int,
    payload: Optional[WishApproveRequest] = None,
    db: Session = Depends(get_db)
):
    """Approve and immediately dispatch a pending wish email through Gmail API."""
    custom_subject = payload.custom_subject if payload else None
    custom_body = payload.custom_body if payload else None

    try:
        result = WishAgent.approve_and_send(
            db=db,
            wish_id=wish_id,
            custom_subject=custom_subject,
            custom_body=custom_body
        )
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except PermissionError as perm_err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(perm_err))
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))


@router.post("/{wish_id}/regenerate")
def regenerate_wish(
    wish_id: int,
    payload: WishRegenerateRequest,
    db: Session = Depends(get_db)
):
    """Regenerate AI subject and body for a pending wish with different tone or notes."""
    try:
        new_content = WishAgent.regenerate_wish_content(
            db=db,
            wish_id=wish_id,
            tone=payload.tone,
            custom_instructions=payload.custom_instructions
        )
        return {"success": True, "wish": new_content}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{wish_id}/reject")
def reject_wish(wish_id: int, db: Session = Depends(get_db)):
    """Reject / cancel a pending wish so it won't be sent."""
    wish = db.query(WishHistory).filter(WishHistory.id == wish_id).first()
    if not wish:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wish not found")

    wish.status = "CANCELLED"
    db.commit()
    return {"success": True, "message": "Wish cancelled"}


@router.post("/{wish_id}/retry")
def retry_failed_wish(wish_id: int, db: Session = Depends(get_db)):
    """Retry sending a previously failed wish."""
    try:
        result = WishAgent.approve_and_send(db=db, wish_id=wish_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/generate-preview")
def generate_preview(payload: ManualWishGenerateRequest, db: Session = Depends(get_db)):
    """Generate a wish preview on demand for any friend without sending."""
    friend = db.query(Friend).filter(Friend.id == payload.friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")

    settings_record = db.query(AppSetting).filter(AppSetting.id == 1).first()
    sender_name = settings_record.sender_name if settings_record else "Kamalesh"
    signature = settings_record.email_signature if settings_record else "Best wishes,\nKamalesh"

    handler = get_occasion_handler(friend.occasion_type)
    guidance = handler.get_prompt_guidance(friend.relationship_type, payload.tone or friend.preferred_tone)
    if payload.custom_instructions:
        guidance = f"{guidance}. Additional user instructions: {payload.custom_instructions}"

    wish = gemini_service.generate_wish(
        name=friend.name,
        occasion=friend.occasion_type,
        relationship=friend.relationship_type,
        personal_notes=friend.personal_notes,
        tone=payload.tone or friend.preferred_tone,
        sender_name=sender_name,
        signature=signature,
        custom_instructions=guidance
    )

    return {
        "friend": {
            "id": friend.id,
            "name": friend.name,
            "email": friend.email,
            "occasion": friend.occasion_type,
            "tone": payload.tone or friend.preferred_tone
        },
        "preview": wish
    }
