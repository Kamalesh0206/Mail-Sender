"""Email History and Approvals Router for WishMail AI."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from backend.database.session import get_db
from backend.database.models import EmailHistory, Friend
from backend.schemas.schemas import EmailHistoryResponse, WishApproveRequest
from backend.agents.wish_agent import WishAgent

router = APIRouter(prefix="/email-history", tags=["Email History & Approvals"])


@router.get("", response_model=List[EmailHistoryResponse])
def get_email_history(
    email_type: Optional[str] = Query(None, description="Filter by WISH or QUOTE"),
    status_filter: Optional[str] = Query(None, description="PENDING, APPROVED, SENT, FAILED, CANCELLED"),
    search: Optional[str] = Query(None, description="Search recipient name, email, or subject"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Retrieve full audit history with filters for Wishes, Quotes, Sent, Failed, and Pending."""
    query = db.query(EmailHistory)
    if email_type:
        query = query.filter(EmailHistory.email_type == email_type)
    if status_filter:
        query = query.filter(EmailHistory.status == status_filter)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (EmailHistory.recipient_name.ilike(search_fmt)) |
            (EmailHistory.recipient_email.ilike(search_fmt)) |
            (EmailHistory.subject.ilike(search_fmt))
        )

    return query.order_by(EmailHistory.id.desc()).limit(limit).all()


@router.post("/{history_id}/approve")
def approve_and_send_email(
    history_id: int,
    payload: Optional[WishApproveRequest] = None,
    db: Session = Depends(get_db)
):
    """Approve and dispatch a pending email draft via Gmail."""
    try:
        custom_subj = payload.custom_subject if payload else None
        custom_body = payload.custom_body if payload else None
        result = WishAgent.approve_and_send(
            db=db,
            history_id=history_id,
            custom_subject=custom_subj,
            custom_body=custom_body
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{history_id}/reject")
def reject_email(history_id: int, db: Session = Depends(get_db)):
    """Reject and cancel a pending email."""
    record = db.query(EmailHistory).filter(EmailHistory.id == history_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    record.status = "CANCELLED"
    db.commit()
    return {"success": True, "message": "Email cancelled"}


@router.post("/{history_id}/retry")
def retry_failed_email(history_id: int, db: Session = Depends(get_db)):
    """Retry sending a failed email."""
    try:
        result = WishAgent.approve_and_send(db=db, history_id=history_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{history_id}/regenerate")
def regenerate_email_content(
    history_id: int,
    tone: Optional[str] = Query("Friendly"),
    db: Session = Depends(get_db)
):
    """Regenerate subject and body for a pending wish using Gemini."""
    try:
        res = WishAgent.regenerate_wish_content(db=db, history_id=history_id, tone=tone)
        return {"success": True, "wish": res}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
