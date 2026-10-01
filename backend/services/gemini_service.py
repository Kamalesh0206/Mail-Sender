"""Gemini AI Service for Personalized Wishes Generation.

Directly utilizes Google Gemini API (no LangChain, no CrewAI).
Generates contextual, warm, and personalized emails with subject and body.
"""

import json
import logging
from typing import Dict, Any, Optional
import os

from backend.config.settings import settings

logger = logging.getLogger("email_agent.gemini")

# System prompt guiding the tone and personalization
SYSTEM_PROMPT = """You are a warm, thoughtful, and articulate personal email assistant.
Your job is to write a personalized wishes email for an important occasion.
The email should feel genuine, human, and tailored to the recipient based on the provided details.

Requirements:
1. Generate a catchy, appropriate email SUBJECT line.
2. Generate an engaging, thoughtful email BODY.
3. Tone must strictly match the requested tone:
   - Friendly: Warm, enthusiastic, cheerful.
   - Professional: Polite, respectful, polished yet personable.
   - Funny: Playful, lighthearted humor, witty, friendly banter.
   - Emotional: Deeply caring, heartfelt, sincere gratitude/appreciation.
   - Casual: Relaxed, conversational, like a quick upbeat chat between close friends.
4. Seamlessly incorporate any personal notes or context (e.g. hobbies, memories, recent milestones) naturally.
5. End with the provided sender's signature.
6. Do NOT include markdown formatting like bold asterisks inside the email text unless appropriate for emphasis.
7. Return ONLY valid JSON in the format:
{
  "subject": "...",
  "body": "..."
}
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
    """Graceful fallback template generator when Gemini API key is not configured."""
    notes_phrase = f" I hope you get some time to enjoy {personal_notes}!" if personal_notes else ""
    
    if tone.lower() == "funny":
        subject = f"Another 365 days around the sun, {name}! 🎉"
        body = (
            f"Hey {name},\n\n"
            f"Happy {occasion}! You don't look a day older than yesterday (and let's keep it that way 😉).{notes_phrase}\n\n"
            f"Wishing you tons of laughs, great food, and zero awkward birthday calls today!\n\n"
            f"{signature or f'Cheers,\n{sender_name}'}"
        )
    elif tone.lower() == "professional":
        subject = f"Wishing you a Happy {occasion}, {name}"
        body = (
            f"Dear {name},\n\n"
            f"Warmest wishes on your {occasion.lower()}! It has been an absolute pleasure working alongside you as a valued {relationship.lower()}.{notes_phrase}\n\n"
            f"I hope you have a rewarding celebration with your loved ones and an exceptional year of success ahead.\n\n"
            f"{signature or f'Best regards,\n{sender_name}'}"
        )
    elif tone.lower() == "emotional":
        subject = f"Happy {occasion} to someone truly special, {name} ❤️"
        body = (
            f"Dear {name},\n\n"
            f"On your special day, I wanted to take a moment to celebrate how much your presence and friendship mean to me.{notes_phrase}\n\n"
            f"Thank you for being such an incredible {relationship.lower()}. May this year bring you boundless happiness, peace, and health.\n\n"
            f"{signature or f'With love and warmth,\n{sender_name}'}"
        )
    elif tone.lower() == "casual":
        subject = f"Happy {occasion}, {name}! 🎈"
        body = (
            f"Hey {name},\n\n"
            f"Just dropping by to wish you an awesome {occasion.lower()}! Hope you're kicking back and having a blast today.{notes_phrase}\n\n"
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


class GeminiWishService:
    """Service wrapping Google Gemini API calls."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        self.model_name = model_name or settings.DEFAULT_AI_MODEL or "gemini-2.5-flash"

    def generate_wish(
        self,
        name: str,
        occasion: str = "Birthday",
        relationship: str = "Friend",
        personal_notes: Optional[str] = None,
        tone: str = "Friendly",
        sender_name: Optional[str] = None,
        signature: Optional[str] = None,
        custom_instructions: Optional[str] = None
    ) -> Dict[str, str]:
        """Generate subject and body for the occasion wish using Gemini API."""
        effective_sender = sender_name or settings.DEFAULT_SENDER_NAME
        effective_sig = signature or settings.DEFAULT_SIGNATURE

        # If no API key is provided, use high-quality intelligent template fallback
        if not self.api_key or self.api_key == "YOUR_GEMINI_API_KEY_HERE":
            logger.warning("Gemini API key is not configured. Falling back to built-in template generator.")
            return _get_fallback_wish(
                name=name,
                occasion=occasion,
                relationship=relationship,
                tone=tone,
                personal_notes=personal_notes,
                sender_name=effective_sender,
                signature=effective_sig
            )

        prompt_data = {
            "recipient_name": name,
            "occasion": occasion,
            "relationship": relationship,
            "preferred_tone": tone,
            "personal_notes": personal_notes or "None provided",
            "sender_name": effective_sender,
            "signature": effective_sig,
            "custom_instructions": custom_instructions or "None"
        }

        user_content = f"""Please generate a wish email using the following parameters:
{json.dumps(prompt_data, indent=2)}

Respond with a JSON object containing keys 'subject' and 'body' only."""

        # Attempt call via google-genai or google.generativeai
        try:
            # First attempt: google-genai (new standard SDK)
            try:
                from google import genai
                from google.genai import types
                
                client = genai.Client(api_key=self.api_key)
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=user_content,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                )
                raw_text = response.text.strip()
                parsed = json.loads(raw_text)
                if "subject" in parsed and "body" in parsed:
                    return {
                        "subject": parsed["subject"].strip(),
                        "body": parsed["body"].strip()
                    }
            except Exception as e_genai:
                logger.info(f"New genai SDK attempt ({e_genai}), trying google.generativeai fallback...")

                # Second attempt: google.generativeai (classic SDK)
                import google.generativeai as gai
                gai.configure(api_key=self.api_key)
                # Map model name if needed
                model_to_use = self.model_name
                if "gemini-2.5" in model_to_use:
                    model_to_use = "gemini-1.5-flash" # fallback if 2.5 is not in older SDK
                
                model = gai.GenerativeModel(
                    model_name=model_to_use,
                    system_instruction=SYSTEM_PROMPT,
                    generation_config={"response_mime_type": "application/json", "temperature": 0.7}
                )
                response = model.generate_content(user_content)
                raw_text = response.text.strip()
                parsed = json.loads(raw_text)
                if "subject" in parsed and "body" in parsed:
                    return {
                        "subject": parsed["subject"].strip(),
                        "body": parsed["body"].strip()
                    }

        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}. Utilizing fallback template.")
            return _get_fallback_wish(
                name=name,
                occasion=occasion,
                relationship=relationship,
                tone=tone,
                personal_notes=personal_notes,
                sender_name=effective_sender,
                signature=effective_sig
            )

        # Fallback if parsing failed
        return _get_fallback_wish(
            name=name,
            occasion=occasion,
            relationship=relationship,
            tone=tone,
            personal_notes=personal_notes,
            sender_name=effective_sender,
            signature=effective_sig
        )


# Singleton instance
gemini_service = GeminiWishService()
