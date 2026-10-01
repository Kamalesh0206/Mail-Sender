"""Google OAuth 2.0 Authentication and Token Management."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from backend.config.settings import settings
from backend.database.session import get_db
from backend.database.models import AppSetting
from backend.services.gmail_service import gmail_service

router = APIRouter(prefix="/auth/google", tags=["Google OAuth & Gmail"])


@router.get("/url")
def get_google_auth_url():
    """Get the Google OAuth 2.0 authorization URL for connecting Gmail."""
    try:
        url, state = gmail_service.generate_authorization_url()
        return {"authorization_url": url, "state": state}
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not generate authorization URL: {str(e)}"
        )


@router.get("/callback")
def google_oauth_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle callback from Google OAuth."""
    if error:
        redirect_target = f"{settings.FRONTEND_URL}/settings?oauth_error={error}"
        return RedirectResponse(url=redirect_target)

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")

    try:
        token_data = gmail_service.exchange_code_for_tokens(code=code)
        # Redirect to frontend settings with success query
        redirect_target = f"{settings.FRONTEND_URL}/settings?oauth=success"
        return RedirectResponse(url=redirect_target)
    except Exception as e:
        redirect_target = f"{settings.FRONTEND_URL}/settings?oauth_error={str(e)}"
        return RedirectResponse(url=redirect_target)


@router.get("/status")
def get_auth_status(db: Session = Depends(get_db)):
    """Check whether Gmail is currently connected and active."""
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
    if not setting:
        return {
            "connected": False,
            "email": None,
            "has_credentials": False
        }

    has_client_config = bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

    return {
        "connected": bool(setting.gmail_connected),
        "email": setting.gmail_email,
        "token_expiry": setting.token_expiry.isoformat() if setting.token_expiry else None,
        "is_configured": has_client_config,
        "client_id_configured": bool(settings.GOOGLE_CLIENT_ID)
    }


@router.post("/disconnect")
def disconnect_gmail(db: Session = Depends(get_db)):
    """Disconnect Gmail account and clear stored OAuth tokens."""
    success = gmail_service.disconnect()
    return {"success": success, "message": "Gmail account disconnected successfully"}
