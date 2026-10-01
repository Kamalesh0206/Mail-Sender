"""Encryption Service for Sensitive Data (OAuth Tokens).

Uses Fernet symmetric encryption with key derivation from configured secrets.
"""

import base64
import hashlib
from cryptography.fernet import Fernet
import logging

from backend.config.settings import settings

logger = logging.getLogger("email_agent.encryption")


def _get_fernet_instance() -> Fernet:
    """Generate a valid 32-byte URL-safe base64-encoded key from configuration."""
    raw_key = settings.ENCRYPTION_KEY or settings.SECRET_KEY or "fallback_encryption_key_for_wishes"
    # Ensure it is deterministically hashed to 32 bytes and base64 encoded
    key_bytes = hashlib.sha256(raw_key.encode("utf-8")).digest()
    b64_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(b64_key)


def encrypt_token(plain_token: str) -> str:
    """Encrypt a plain token string."""
    if not plain_token:
        return ""
    try:
        f = _get_fernet_instance()
        encrypted = f.encrypt(plain_token.encode("utf-8"))
        return encrypted.decode("utf-8")
    except Exception as e:
        logger.error(f"Token encryption failed: {e}")
        raise ValueError("Failed to encrypt token") from e


def decrypt_token(cipher_token: str) -> str:
    """Decrypt an encrypted token string."""
    if not cipher_token:
        return ""
    try:
        f = _get_fernet_instance()
        decrypted = f.decrypt(cipher_token.encode("utf-8"))
        return decrypted.decode("utf-8")
    except Exception as e:
        logger.error(f"Token decryption failed: {e}")
        raise ValueError("Failed to decrypt token. Key may have changed or token is corrupted.") from e
