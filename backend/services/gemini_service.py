"""Gemini AI Service for WishMail AI.

Directly utilizes Google Gemini API (no LangChain, no CrewAI).
Supports:
- generate_wish()
- generate_subject()
- generate_greeting()
- generate_email_introduction()

CRITICAL PRINCIPLE:
User-provided quotes must NEVER be altered, rewritten, or paraphrased.
Gemini is only used to generate contextual introductions or wishes.
"""

import json
import logging
from typing import Dict, Any, Optional
import os

from backend.config.settings import settings

logger = logging.getLogger("wishmail.gemini")

SYSTEM_WISH_PROMPT = """You are a warm, thoughtful, and articulate personal email assistant for WishMail AI.
Your job is to write a personalized wishes email for an important occasion.

Requirements:
1. Generate an engaging, appropriate email SUBJECT line.
2. Generate an engaging, thoughtful email BODY.
3. Tone must strictly match the requested tone (Friendly, Casual, Emotional, Funny, Professional).
4. Seamlessly incorporate any personal notes or context (e.g. hobbies, memories, recent milestones) naturally.
5. End with the provided sender's signature.
6. Do NOT include markdown bold markers inside plain text unless essential.
7. Return ONLY valid JSON in format: {"subject": "...", "body": "..."}
"""


def _get_fallback_wish(
    name: str,
    occasion: str,
    relationship: str,
    tone: str,
    personal_notes: Optional[str],
    sender_name: str,
    signature: str
) -> Dict[str, str]:
    """Reliable fallback template generator when Gemini API key is missing or offline."""
    notes_phrase = f" I hope you get some time to enjoy {personal_notes}!" if personal_notes else ""
    t_lower = (tone or "Friendly").lower()

    if t_lower == "funny":
        subject = f"Another 365 days around the sun, {name}! 🎉"
        body = (
            f"Hey {name},\n\n"
            f"Happy {occasion}! You don't look a day older than yesterday (and let's keep it that way 😉).{notes_phrase}\n\n"
            f"Wishing you tons of laughs, delicious cake, and zero awkward celebration calls today!\n\n"
            f"{signature or f'Cheers,\n{sender_name}'}"
        )
    elif t_lower == "professional":
        subject = f"Warmest wishes on your {occasion}, {name}"
        body = (
            f"Dear {name},\n\n"
            f"Warmest congratulations on your {occasion.lower()}! It has been an absolute pleasure knowing and collaborating with you as a valued {relationship.lower()}.{notes_phrase}\n\n"
            f"Wishing you a memorable day of celebration and continued success in the year ahead.\n\n"
            f"{signature or f'Best regards,\n{sender_name}'}"
        )
    elif t_lower == "emotional":
        subject = f"Happy {occasion} to someone truly special, {name} ❤️"
        body = (
            f"Dear {name},\n\n"
            f"On your special day, I wanted to take a moment to celebrate how much your presence and companionship mean to me.{notes_phrase}\n\n"
            f"Thank you for being such an incredible {relationship.lower()}. May your year ahead be blessed with good health, deep peace, and endless joy.\n\n"
            f"{signature or f'With love and gratitude,\n{sender_name}'}"
        )
    elif t_lower == "casual":
        subject = f"Happy {occasion}, {name}! 🎈"
        body = (
            f"Hey {name},\n\n"
            f"Just dropping by to wish you an awesome {occasion.lower()}! Hope you're taking it easy and having a blast today.{notes_phrase}\n\n"
            f"Catch up soon!\n\n"
            f"{signature or f'Best,\n{sender_name}'}"
        )
    else:  # Friendly (Default)
        subject = f"Happy {occasion}, {name}! 🎉"
        body = (
            f"Hi {name},\n\n"
            f"Wishing you a very happy {occasion.lower()}! 🎂 Hope you have an amazing day filled with happiness, fun, and wonderful memories.{notes_phrase}\n\n"
            f"Have a fantastic year ahead!\n\n"
            f"{signature or f'Best wishes,\n{sender_name}'}"
        )

    return {"subject": subject, "body": body}


class GeminiService:
    """Core Google Gemini API Service."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.model_name = model_name or settings.DEFAULT_AI_MODEL or "gemini-2.5-flash"

    def generate_wish(
        self,
        friend_name: str,
        occasion: str = "Birthday",
        relationship: str = "Close Friend",
        personal_notes: Optional[str] = None,
        tone: str = "Friendly",
        sender_name: Optional[str] = None,
        signature: Optional[str] = None
    ) -> Dict[str, str]:
        """Generate personalized occasion email with subject and body."""
        eff_sender = sender_name or settings.DEFAULT_SENDER_NAME
        eff_sig = signature or settings.DEFAULT_SIGNATURE

        if not self.api_key or self.api_key == "YOUR_GEMINI_API_KEY_HERE":
            return _get_fallback_wish(
                name=friend_name,
                occasion=occasion,
                relationship=relationship,
                tone=tone,
                personal_notes=personal_notes,
                sender_name=eff_sender,
                signature=eff_sig
            )

        prompt_data = {
            "friend_name": friend_name,
            "occasion": occasion,
            "relationship": relationship,
            "personal_notes": personal_notes or "None",
            "preferred_tone": tone,
            "sender_name": eff_sender,
            "signature": eff_sig
        }

        user_content = f"Generate an occasion wish email for:\n{json.dumps(prompt_data, indent=2)}\nRespond in JSON format with 'subject' and 'body'."

        try:
            from google import genai
            from google.genai import types
            
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model=self.model_name,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_WISH_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.7,
                )
            )
            raw_text = response.text.strip()
            parsed = json.loads(raw_text)
            if "subject" in parsed and "body" in parsed:
                return {"subject": parsed["subject"].strip(), "body": parsed["body"].strip()}
        except Exception as e:
            logger.warning(f"Gemini API attempt error: {e}, falling back to template...")

        return _get_fallback_wish(
            name=friend_name,
            occasion=occasion,
            relationship=relationship,
            tone=tone,
            personal_notes=personal_notes,
            sender_name=eff_sender,
            signature=eff_sig
        )

    def generate_subject(self, topic_or_quote: str, recipient_name: Optional[str] = None) -> str:
        """Generate a short, elegant subject line for a quote or thought."""
        default_sub = f"🌅 Today's Thought for {recipient_name}" if recipient_name else "🌅 Today's Thought"
        if not self.api_key or self.api_key == "YOUR_GEMINI_API_KEY_HERE":
            return default_sub

        try:
            from google import genai
            client = genai.Client(api_key=self.api_key)
            prompt = f"Create a short, inspiring 3-6 word email subject line (with one subtle emoji) for this quote:\n\"{topic_or_quote}\"\nReturn ONLY the subject line text."
            resp = client.models.generate_content(model=self.model_name, contents=prompt)
            return resp.text.strip().replace('"', '')
        except Exception:
            return default_sub

    def generate_greeting(self, friend_name: str, relationship: str = "Friend") -> str:
        """Generate an appropriate greeting line."""
        return f"Hi {friend_name},"

    def generate_email_introduction(
        self,
        friend_name: str,
        relationship: str = "Friend",
        context: Optional[str] = None
    ) -> str:
        """Generate a short 1-2 sentence warm introduction leading up to the quote.
        
        NOTE: Never modifies the quote itself.
        """
        if not self.api_key or self.api_key == "YOUR_GEMINI_API_KEY_HERE":
            return "Hope you're having a wonderful and productive day."

        try:
            from google import genai
            client = genai.Client(api_key=self.api_key)
            prompt = (
                f"Write a warm 1-sentence opening for an email to my {relationship}, {friend_name}, "
                f"before sharing a thought for the day. Keep it natural and polite."
            )
            resp = client.models.generate_content(model=self.model_name, contents=prompt)
            return resp.text.strip().replace('"', '')
        except Exception:
            return "Hope you're having a wonderful and productive day."


gemini_service = GeminiService()
