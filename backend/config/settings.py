"""Application Configuration Module using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Birthday & Wishes AI Email Agent"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    
    # Security & Encryption
    # 32 url-safe base64-encoded bytes for Fernet token encryption
    SECRET_KEY: str = Field(default="wishes_secret_key_change_in_production_32bytes_min!", description="General secret key")
    ENCRYPTION_KEY: str = Field(default="5vVq7X7n_F7sZl8H_vJ4Y6vV-qX7n_F7sZl8HvJ4Y6s=", description="Fernet encryption key for OAuth tokens")
    
    # Database
    # Default to sqlite for seamless zero-config local run, seamlessly supports PostgreSQL via postgresql://
    DATABASE_URL: str = Field(
        default="sqlite:///./wishes.db",
        description="Database URL (PostgreSQL e.g. postgresql://postgres:password@localhost:5432/wishes_db or SQLite)"
    )
    
    # Gemini AI
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Google Gemini API Key")
    DEFAULT_AI_MODEL: str = Field(default="gemini-2.5-flash", description="Gemini model name")
    
    # Google OAuth 2.0 Credentials (Gmail API)
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None, description="Google OAuth Client ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None, description="Google OAuth Client Secret")
    GOOGLE_REDIRECT_URI: str = Field(default="http://localhost:8000/api/v1/auth/google/callback", description="OAuth Redirect URI")
    
    # Frontend Origin (for CORS)
    FRONTEND_URL: str = Field(default="http://localhost:5173", description="Frontend React app URL")
    
    # Scheduler Configuration
    SCHEDULER_ENABLED: bool = True
    DEFAULT_DAILY_HOUR: int = 8
    DEFAULT_DAILY_MINUTE: int = 0
    
    # Sender Profile Defaults
    DEFAULT_SENDER_NAME: str = "Kamalesh"
    DEFAULT_SIGNATURE: str = "Best wishes,\nKamalesh"
    DEFAULT_APPROVAL_MODE: str = "APPROVAL"  # "APPROVAL" or "AUTO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
