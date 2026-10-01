"""Wish Agent Orchestrator.

Implements the daily workflow:
Scheduler / Manual trigger
-> Check today's date
-> Query friends database
-> Find today's birthdays / occasions
-> Check duplicate protection constraint
-> Generate personalized email with Gemini
-> Auto-send if AUTO MODE, or stage for approval if APPROVAL MODE
-> Record result in database with Gmail Message ID / error logs.
"""

from typing import List, Dict, Any, Optional
import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database.models import Friend, WishHistory, AppSetting
from backend.services.gemini_service import gemini_service
from backend.services.gmail_service import gmail_service
from backend.agents.occasions import get_occasion_handler

logger = logging.getLogger("email_agent.agent")


class WishAgent:
    """Core AI Agent orchestrating scans, generation, and delivery."""

    @classmethod
    def run_daily_check(cls, db: Session, target_date: Optional[datetime.date] = None) -> Dict[str, Any]:
        """Execute daily occasion check, generation, and dispatch."""
        today = target_date or datetime.date.today()
        current_year = today.year
        current_month = today.month
        current_day = today.day

        # 1. Fetch system settings
        settings_record = db.query(AppSetting).filter(AppSetting.id == 1).first()
        is_auto_mode = (settings_record.automation_mode == "AUTO") if settings_record else False
        sender_name = settings_record.sender_name if settings_record else "Kamalesh"
        signature = settings_record.email_signature if settings_record else "Best wishes,\nKamalesh"

        logger.info(
            f"Running occasion check for date {today} (Month {current_month}, Day {current_day}). "
            f"Mode: {'AUTO' if is_auto_mode else 'APPROVAL'}"
        )

        # 2. Query active friends matching today's month & day
        matching_friends = db.query(Friend).filter(
            Friend.is_active == True,
            Friend.birth_month == current_month,
            Friend.birth_day == current_day
        ).all()

        results = {
            "date": today.isoformat(),
            "mode": "AUTO" if is_auto_mode else "APPROVAL",
            "found_count": len(matching_friends),
            "generated": [],
            "sent": [],
            "pending": [],
            "skipped": [],
            "failed": []
        }

        for friend in matching_friends:
            occasion_type = friend.occasion_type or "Birthday"
            
            # 3. Duplicate Protection Check
            # Never send or queue the same occasion email twice for the same person in the same year
            existing_wish = db.query(WishHistory).filter(
                WishHistory.friend_id == friend.id,
                WishHistory.occasion_type == occasion_type,
                WishHistory.year == current_year
            ).first()

            if existing_wish:
                if existing_wish.status == "SENT":
                    logger.info(f"Skipping {friend.name}: already sent {occasion_type} email for {current_year}.")
                    results["skipped"].append({
                        "friend_id": friend.id,
                        "name": friend.name,
                        "reason": f"Already sent for {current_year}"
                    })
                    continue
                elif existing_wish.status == "PENDING_APPROVAL":
                    logger.info(f"{friend.name} already has a pending approval for {occasion_type} {current_year}.")
                    results["pending"].append({
                        "wish_id": existing_wish.id,
                        "friend_id": friend.id,
                        "name": friend.name,
                        "status": "PENDING_APPROVAL"
                    })
                    continue

            # 4. Generate AI Wish using Gemini API
            handler = get_occasion_handler(occasion_type)
            guidance = handler.get_prompt_guidance(friend.relationship_type, friend.preferred_tone)
            
            wish_content = gemini_service.generate_wish(
                name=friend.name,
                occasion=occasion_type,
                relationship=friend.relationship_type,
                personal_notes=friend.personal_notes,
                tone=friend.preferred_tone,
                sender_name=sender_name,
                signature=signature,
                custom_instructions=guidance
            )

            subject = wish_content.get("subject", f"Happy {occasion_type}, {friend.name}!")
            body = wish_content.get("body", f"Wishing you a wonderful {occasion_type}!")

            # 5. Handle Delivery or Approval Queue
            if is_auto_mode:
                # AUTO MODE: Send immediately via Gmail
                send_status = "SENT"
                gmail_id = None
                error_msg = None
                sent_at = datetime.datetime.now(datetime.timezone.utc)

                try:
                    send_resp = gmail_service.send_email(
                        to_email=friend.email,
                        subject=subject,
                        body_text=body
                    )
                    gmail_id = send_resp.get("message_id")
                    results["sent"].append({
                        "friend_id": friend.id,
                        "name": friend.name,
                        "email": friend.email,
                        "gmail_message_id": gmail_id
                    })
                except Exception as e:
                    logger.error(f"Auto-send failed for {friend.name} ({friend.email}): {e}")
                    send_status = "FAILED"
                    error_msg = str(e)
                    sent_at = None
                    results["failed"].append({
                        "friend_id": friend.id,
                        "name": friend.name,
                        "error": str(e)
                    })

                new_wish = WishHistory(
                    friend_id=friend.id,
                    occasion_type=occasion_type,
                    year=current_year,
                    recipient_name=friend.name,
                    recipient_email=friend.email,
                    tone=friend.preferred_tone,
                    generated_subject=subject,
                    generated_body=body,
                    status=send_status,
                    scheduled_for=today,
                    sent_at=sent_at,
                    gmail_message_id=gmail_id,
                    error_message=error_msg
                )
                try:
                    db.add(new_wish)
                    db.commit()
                    db.refresh(new_wish)
                except IntegrityError:
                    db.rollback()
                    logger.warning(f"Duplicate constraint caught on insert for {friend.name} ({current_year})")

            else:
                # APPROVAL MODE (Default): Create pending draft for user confirmation
                new_wish = WishHistory(
                    friend_id=friend.id,
                    occasion_type=occasion_type,
                    year=current_year,
                    recipient_name=friend.name,
                    recipient_email=friend.email,
                    tone=friend.preferred_tone,
                    generated_subject=subject,
                    generated_body=body,
                    status="PENDING_APPROVAL",
                    scheduled_for=today
                )
                try:
                    db.add(new_wish)
                    db.commit()
                    db.refresh(new_wish)
                    results["pending"].append({
                        "wish_id": new_wish.id,
                        "friend_id": friend.id,
                        "name": friend.name,
                        "subject": subject,
                        "status": "PENDING_APPROVAL"
                    })
                except IntegrityError:
                    db.rollback()
                    logger.warning(f"Duplicate constraint caught on insert for {friend.name} ({current_year})")

        return results

    @classmethod
    def approve_and_send(
        cls,
        db: Session,
        wish_id: int,
        custom_subject: Optional[str] = None,
        custom_body: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve and dispatch a pending wish email through Gmail API."""
        wish = db.query(WishHistory).filter(WishHistory.id == wish_id).first()
        if not wish:
            raise ValueError(f"Wish draft with ID {wish_id} not found")

        # Allow sending if PENDING_APPROVAL or retrying if FAILED
        if wish.status == "SENT":
            raise ValueError("This wish email has already been sent!")

        subject_to_send = custom_subject.strip() if custom_subject else wish.generated_subject
        body_to_send = custom_body.strip() if custom_body else wish.generated_body

        try:
            send_resp = gmail_service.send_email(
                to_email=wish.recipient_email,
                subject=subject_to_send,
                body_text=body_to_send
            )
            wish.generated_subject = subject_to_send
            wish.generated_body = body_to_send
            wish.status = "SENT"
            wish.sent_at = datetime.datetime.now(datetime.timezone.utc)
            wish.gmail_message_id = send_resp.get("message_id")
            wish.error_message = None
            db.commit()
            db.refresh(wish)

            return {
                "success": True,
                "wish_id": wish.id,
                "status": "SENT",
                "gmail_message_id": wish.gmail_message_id
            }

        except Exception as e:
            logger.error(f"Failed to send approved email for wish #{wish_id}: {e}")
            wish.status = "FAILED"
            wish.error_message = str(e)
            db.commit()
            raise RuntimeError(f"Gmail delivery failed: {str(e)}") from e

    @classmethod
    def regenerate_wish_content(
        cls,
        db: Session,
        wish_id: int,
        tone: Optional[str] = None,
        custom_instructions: Optional[str] = None
    ) -> Dict[str, str]:
        """Regenerate subject and body for a pending wish with different tone or instructions."""
        wish = db.query(WishHistory).filter(WishHistory.id == wish_id).first()
        if not wish:
            raise ValueError(f"Wish draft with ID {wish_id} not found")

        friend = db.query(Friend).filter(Friend.id == wish.friend_id).first()
        effective_tone = tone or wish.tone or (friend.preferred_tone if friend else "Friendly")
        
        settings_record = db.query(AppSetting).filter(AppSetting.id == 1).first()
        sender_name = settings_record.sender_name if settings_record else "Kamalesh"
        signature = settings_record.email_signature if settings_record else "Best wishes,\nKamalesh"

        wish_content = gemini_service.generate_wish(
            name=wish.recipient_name,
            occasion=wish.occasion_type,
            relationship=friend.relationship_type if friend else "Friend",
            personal_notes=friend.personal_notes if friend else None,
            tone=effective_tone,
            sender_name=sender_name,
            signature=signature,
            custom_instructions=custom_instructions
        )

        wish.generated_subject = wish_content["subject"]
        wish.generated_body = wish_content["body"]
        wish.tone = effective_tone
        db.commit()
        db.refresh(wish)

        return wish_content


wish_agent = WishAgent()
