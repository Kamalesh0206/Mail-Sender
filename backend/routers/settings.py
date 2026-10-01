"""Application Settings & Gmail Test Endpoints for WishMail AI."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.database.models import AppSetting
from backend.schemas.schemas import AppSettingsResponse, AppSettingsUpdate, SendTestEmailRequest
from backend.scheduler.daily_scheduler import reschedule_daily_job
from backend.services.gmail_service import gmail_service

router = APIRouter(tags=["Settings & Gmail"])


@router.get("/settings", response_model=AppSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve current application configuration."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    if not setting:
        setting = AppSetting(id=1)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.put("/settings", response_model=AppSettingsResponse)
def update_settings(payload: AppSettingsUpdate, db: Session = Depends(get_db)):
    """Update settings (Approval mode, send time, signature, tone, quote greeting/closing, timezone)."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    if not setting:
        setting = AppSetting(id=1)
        db.add(setting)

    update_data = payload.model_dump(exclude_unset=True)

    if "default_send_time" in update_data and update_data["default_send_time"]:
        try:
            reschedule_daily_job(update_data["default_send_time"])
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid time: {e}")

    for k, v in update_data.items():
        setattr(setting, k, v)

    db.commit()
    db.refresh(setting)
    return setting


@router.post("/gmail/test")
def send_test_email(payload: SendTestEmailRequest, db: Session = Depends(get_db)):
    """Send a test email using connected Gmail API to verify integration."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    if not setting or not setting.gmail_connected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gmail account is not connected. Please connect your Google account in Settings."
        )

    try:
        sender_disp = setting.sender_name or "WishMail AI"
        full_body = (
            f"{payload.body}\n\n"
            f"---\n"
            f"{setting.email_signature or f'Best wishes,\n{sender_disp}'}"
        )

        result = gmail_service.send_email(
            to_email=str(payload.recipient_email),
            subject=payload.subject or "WishMail AI Test",
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
