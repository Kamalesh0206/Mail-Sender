"""Gmail Integration Service using Google OAuth 2.0 and official Gmail API.

Follows Google security policies:
- Request minimum scopes (gmail.send and userinfo.email)
- No Gmail passwords stored
- Tokens encrypted via Fernet
- Auto-refresh expired access tokens
"""

import base64
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional, Tuple
import datetime
import logging

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from backend.config.settings import settings
from backend.services.encryption import encrypt_token, decrypt_token
from backend.database.models import AppSetting
from backend.database.session import get_db_context

logger = logging.getLogger("email_agent.gmail")

# Minimal required scopes
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email"
]


class GmailService:
    """Manages Google OAuth 2.0 flow and sending emails through Gmail API."""

    @staticmethod
    def get_oauth_flow(redirect_uri: Optional[str] = None) -> Flow:
        """Create and configure Google OAuth 2.0 Flow."""
        client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID or "",
                "client_secret": settings.GOOGLE_CLIENT_SECRET or "",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri or settings.GOOGLE_REDIRECT_URI]
            }
        }
        flow = Flow.from_client_config(
            client_config,
            scopes=GMAIL_SCOPES,
            redirect_uri=redirect_uri or settings.GOOGLE_REDIRECT_URI
        )
        return flow

    @staticmethod
    def generate_authorization_url() -> Tuple[str, str]:
        """Generate the Google OAuth 2.0 login URL and anti-CSRF state token."""
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValueError(
                "Google Client ID or Secret is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
            )
        flow = GmailService.get_oauth_flow()
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent"  # Ensure refresh_token is always returned
        )
        return authorization_url, state

    @staticmethod
    def exchange_code_for_tokens(code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """Exchange OAuth auth code for access token, refresh token, and user email."""
        flow = GmailService.get_oauth_flow(redirect_uri=redirect_uri)
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Fetch the authenticated user's email address
        user_email = None
        try:
            oauth2_service = build("oauth2", "v2", credentials=credentials)
            user_info = oauth2_service.userinfo().get().execute()
            user_email = user_info.get("email")
        except Exception as e:
            logger.warning(f"Could not retrieve userinfo profile: {e}")

        # Securely encrypt refresh token
        encrypted_rt = encrypt_token(credentials.refresh_token) if credentials.refresh_token else None

        # Save into AppSetting
        with get_db_context() as db:
            setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
            if not setting:
                setting = AppSetting(id=1)
                db.add(setting)

            setting.gmail_connected = True
            if user_email:
                setting.gmail_email = user_email
            if encrypted_rt:
                setting.encrypted_refresh_token = encrypted_rt
            setting.access_token = credentials.token
            if credentials.expiry:
                setting.token_expiry = credentials.expiry
            db.commit()

        return {
            "email": user_email,
            "connected": True,
            "has_refresh_token": bool(credentials.refresh_token)
        }

    @staticmethod
    def get_credentials() -> Optional[Credentials]:
        """Retrieve and auto-refresh credentials from database."""
        with get_db_context() as db:
            setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
            if not setting or not setting.gmail_connected:
                return None

            refresh_token = None
            if setting.encrypted_refresh_token:
                try:
                    refresh_token = decrypt_token(setting.encrypted_refresh_token)
                except Exception as e:
                    logger.error(f"Failed to decrypt refresh token: {e}")

            if not refresh_token and not setting.access_token:
                return None

            creds = Credentials(
                token=setting.access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=GMAIL_SCOPES
            )

            # Check if token is expired or about to expire and refresh it
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                    setting.access_token = creds.token
                    if creds.expiry:
                        setting.token_expiry = creds.expiry
                    db.commit()
                    logger.info("Successfully refreshed expired Gmail OAuth token.")
                except Exception as e:
                    logger.error(f"Failed refreshing Gmail token: {e}")
                    return None

            return creds

    @staticmethod
    def disconnect() -> bool:
        """Disconnect Gmail integration and erase tokens from database."""
        with get_db_context() as db:
            setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
            if setting:
                setting.gmail_connected = False
                setting.encrypted_refresh_token = None
                setting.access_token = None
                setting.token_expiry = None
                setting.gmail_email = None
                db.commit()
                return True
        return False

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an email using official Gmail API users.messages.send.
        
        Returns dict with message ID and status.
        """
        creds = GmailService.get_credentials()
        if not creds:
            raise PermissionError(
                "Gmail is not connected or authorization has expired. Please connect Gmail in Settings."
            )

        try:
            service = build("gmail", "v1", credentials=creds)

            # Create MIME message
            if body_html:
                message = MIMEMultipart("alternative")
                part1 = MIMEText(body_text, "plain", "utf-8")
                part2 = MIMEText(body_html, "html", "utf-8")
                message.attach(part1)
                message.attach(part2)
            else:
                # Wrap plain text in clean HTML styling with paragraphs for modern look
                message = MIMEMultipart("alternative")
                part1 = MIMEText(body_text, "plain", "utf-8")
                
                html_formatted = body_text.replace("\n", "<br/>")
                styled_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }}
    .email-container {{
      background: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }}
    .content {{
      font-size: 16px;
      margin-bottom: 24px;
    }}
    .footer {{
      font-size: 13px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="content">
      {html_formatted}
    </div>
    <div class="footer">
      Sent with warmth via AI Wishes Agent
    </div>
  </div>
</body>
</html>"""
                part2 = MIMEText(styled_html, "html", "utf-8")
                message.attach(part1)
                message.attach(part2)

            message["to"] = to_email
            message["subject"] = subject

            # Encode as URL-safe base64 string
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
            send_body = {"raw": raw_message}

            result = service.users().messages().send(userId="me", body=send_body).execute()
            logger.info(f"Email successfully sent to {to_email}. Message ID: {result.get('id')}")

            return {
                "success": True,
                "message_id": result.get("id"),
                "thread_id": result.get("threadId")
            }

        except HttpError as http_err:
            error_details = str(http_err)
            logger.error(f"Gmail API HttpError while sending to {to_email}: {error_details}")
            raise RuntimeError(f"Gmail API Error: {error_details}") from http_err
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {e}")
            raise RuntimeError(f"Failed to send email: {str(e)}") from e


gmail_service = GmailService()
