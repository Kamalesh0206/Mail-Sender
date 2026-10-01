"""Application Settings & Test Email Endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database.session import get_db
from backend.database.models import AppSetting
from backend.schemas.schemas import AppSettingsResponse, AppSettingsUpdate, SendTestEmailRequest
from backend.scheduler.daily_scheduler import reschedule_daily_job
from backend.services.gmail_service import gmail_service

router = APIRouter(prefix="/settings", tags=["Application Settings"])


@router.get("", response_model=AppSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve current application configuration."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    if not setting:
        setting = AppSetting(id=1)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.put("", response_model=AppSettingsResponse)
def update_settings(payload: AppSettingsUpdate, db: Session = Depends(get_db)):
    """Update settings (Approval mode, send time, signature, tone, AI model)."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    if not setting:
        setting = AppSetting(id=1)
        db.add(setting)

    update_data = payload.model_dump(exclude_unset=True)

    # Check if send time changed and reschedule APScheduler job
    if "daily_send_time" in update_data and update_data["daily_send_time"]:
        new_time = update_data["daily_send_time"]
        try:
            reschedule_daily_job(new_time)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time format (expected HH:MM): {e}"
            )

    for key, val in update_data.items():
        setattr(setting, key, val)

    db.commit()
    db.refresh(setting)
    return setting


@router.post("/send-test")
def send_test_email(payload: SendTestEmailRequest, db: Session = Depends(get_db)):
    """Send a test email using connected Gmail API to verify integration."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    if not setting or not setting.gmail_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gmail account is not connected. Please connect your Google account first."
        )

    try:
        sender_display = setting.sender_name or "AI Wishes Agent"
        full_body = f"{payload.body}\n\n---\n{setting.email_signature or 'Best wishes'}"

        result = gmail_service.send_email(
            to_email=str(payload.recipient_email),
            subject=payload.subject or "Test Email from Wishes Agent",
            body_text=full_body
        )

        return {
            "success": True,
            "message": f"Test email successfully sent to {payload.recipient_email}!",
            "message_id": result.get("message_id")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}"
        )
