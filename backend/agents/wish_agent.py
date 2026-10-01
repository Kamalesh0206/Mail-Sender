"""Wish Agent Orchestrator for WishMail AI.

Handles occasion detection, Gemini wish generation, approval queue, and dispatch.
Protects against duplicates using (friend_id, occasion_name, sent_date).
"""

from typing import List, Dict, Any, Optional
import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database.models import Friend, Occasion, EmailHistory, AppSetting
from backend.services.gemini_service import gemini_service
from backend.services.gmail_service import gmail_service

logger = logging.getLogger("wishmail.wish_agent")


class WishAgent:
    """Core AI Agent orchestrating occasion scans, generation, and delivery."""

    @classmethod
    def run_daily_check(cls, db: Session, target_date: Optional[datetime.date] = None) -> Dict[str, Any]:
        """Execute daily occasion check, Gemini wish generation, and dispatch/staging."""
        today = target_date or datetime.date.today()
        current_month = today.month
        current_day = today.day

        # 1. Fetch system settings
        settings_record = db.query(AppSetting).filter(AppSetting.id == 1).first()
        is_auto_mode = settings_record.auto_send_wishes if settings_record else False
        sender_name = settings_record.sender_name if settings_record else "Kamalesh"
        signature = settings_record.email_signature if settings_record else "Best wishes,\nKamalesh"
        default_tone = settings_record.default_wish_tone if settings_record else "Friendly"

        logger.info(
            f"Checking occasions for {today} (Month {current_month}, Day {current_day}). "
            f"Mode: {'AUTO SEND' if is_auto_mode else 'APPROVAL'}"
        )

        # 2. Query active occasions occurring today
        todays_occasions = db.query(Occasion).join(Friend).filter(
            Occasion.is_active == True,
            Occasion.month == current_month,
            Occasion.day == current_day,
            Friend.is_active == True,
            Friend.enable_wishes == True
        ).all()

        results = {
            "date": today.isoformat(),
            "mode": "AUTO" if is_auto_mode else "APPROVAL",
            "found_count": len(todays_occasions),
            "sent": [],
            "pending": [],
            "skipped": [],
            "failed": []
        }

        for occ in todays_occasions:
            friend = occ.friend
            occasion_name = occ.occasion_type or occ.title

            # 3. Duplicate Protection Check: (friend_id, occasion_name, sent_date)
            existing_email = db.query(EmailHistory).filter(
                EmailHistory.friend_id == friend.id,
                EmailHistory.occasion_name == occasion_name,
                EmailHistory.sent_date == today
            ).first()

            if existing_email:
                if existing_email.status == "SENT":
                    logger.info(f"Skipping {friend.name}: already sent {occasion_name} wish on {today}.")
                    results["skipped"].append({"friend_id": friend.id, "name": friend.name, "reason": "Already sent today"})
                    continue
                elif existing_email.status == "PENDING":
                    results["pending"].append({"history_id": existing_email.id, "name": friend.name})
                    continue

            # 4. Generate AI Wish using Gemini API
            wish_content = gemini_service.generate_wish(
                friend_name=friend.name,
                occasion=occ.occasion_type,
                relationship=friend.relationship,
                personal_notes=friend.personal_notes or occ.notes,
                tone=default_tone,
                sender_name=sender_name,
                signature=signature
            )

            subject = wish_content.get("subject", f"Happy {occ.occasion_type}, {friend.name}! 🎉")
            body = wish_content.get("body", f"Wishing you a wonderful {occ.occasion_type}!")
            sent_time_str = datetime.datetime.now().strftime("%I:%M %p")

            # 5. Handle Delivery or Approval Queue
            if is_auto_mode:
                send_status = "SENT"
                gmail_id = None
                error_msg = None

                try:
                    send_resp = gmail_service.send_email(
                        to_email=friend.email,
                        subject=subject,
                        body_text=body
                    )
                    gmail_id = send_resp.get("message_id")
                    results["sent"].append({"friend_id": friend.id, "name": friend.name, "gmail_id": gmail_id})
                except Exception as e:
                    logger.error(f"Auto-send failed for {friend.name} ({friend.email}): {e}")
                    send_status = "FAILED"
                    error_msg = str(e)
                    results["failed"].append({"friend_id": friend.id, "name": friend.name, "error": str(e)})

                new_record = EmailHistory(
                    recipient_name=friend.name,
                    recipient_email=friend.email,
                    email_type="WISH",
                    occasion_id=occ.id,
                    occasion_name=occasion_name,
                    friend_id=friend.id,
                    subject=subject,
                    body=body,
                    sent_date=today,
                    sent_time=sent_time_str,
                    status=send_status,
                    gmail_message_id=gmail_id,
                    error_message=error_msg
                )
                try:
                    db.add(new_record)
                    db.commit()
                except IntegrityError:
                    db.rollback()

            else:
                # APPROVAL MODE (Default): Create pending draft
                new_record = EmailHistory(
                    recipient_name=friend.name,
                    recipient_email=friend.email,
                    email_type="WISH",
                    occasion_id=occ.id,
                    occasion_name=occasion_name,
                    friend_id=friend.id,
                    subject=subject,
                    body=body,
                    sent_date=today,
                    sent_time=sent_time_str,
                    status="PENDING"
                )
                try:
                    db.add(new_record)
                    db.commit()
                    db.refresh(new_record)
                    results["pending"].append({"history_id": new_record.id, "name": friend.name, "subject": subject})
                except IntegrityError:
                    db.rollback()

        return results

    @classmethod
    def approve_and_send(
        cls,
        db: Session,
        history_id: int,
        custom_subject: Optional[str] = None,
        custom_body: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve and dispatch an email draft through Gmail API."""
        record = db.query(EmailHistory).filter(EmailHistory.id == history_id).first()
        if not record:
            raise ValueError(f"Email record #{history_id} not found")

        if record.status == "SENT":
            raise ValueError("This email has already been sent!")

        subject_to_send = custom_subject.strip() if custom_subject else record.subject
        body_to_send = custom_body.strip() if custom_body else record.body

        try:
            send_resp = gmail_service.send_email(
                to_email=record.recipient_email,
                subject=subject_to_send,
                body_text=body_to_send
            )
            record.subject = subject_to_send
            record.body = body_to_send
            record.status = "SENT"
            record.sent_time = datetime.datetime.now().strftime("%I:%M %p")
            record.gmail_message_id = send_resp.get("message_id")
            record.error_message = None
            db.commit()
            db.refresh(record)

            return {
                "success": True,
                "history_id": record.id,
                "status": "SENT",
                "gmail_message_id": record.gmail_message_id
            }
        except Exception as e:
            logger.error(f"Failed to dispatch email #{history_id}: {e}")
            record.status = "FAILED"
            record.error_message = str(e)
            db.commit()
            raise RuntimeError(f"Gmail delivery failed: {str(e)}") from e

    @classmethod
    def regenerate_wish_content(
        cls,
        db: Session,
        history_id: int,
        tone: Optional[str] = None
    ) -> Dict[str, str]:
        """Regenerate AI wish subject and body using Gemini."""
        record = db.query(EmailHistory).filter(EmailHistory.id == history_id).first()
        if not record:
            raise ValueError(f"Email record #{history_id} not found")

        friend = db.query(Friend).filter(Friend.id == record.friend_id).first()
        settings_record = db.query(AppSetting).filter(AppSetting.id == 1).first()
        sender_name = settings_record.sender_name if settings_record else "Kamalesh"
        signature = settings_record.email_signature if settings_record else "Best wishes,\nKamalesh"
        eff_tone = tone or (settings_record.default_wish_tone if settings_record else "Friendly")

        wish_content = gemini_service.generate_wish(
            friend_name=record.recipient_name,
            occasion=record.occasion_name or "Special Occasion",
            relationship=friend.relationship if friend else "Friend",
            personal_notes=friend.personal_notes if friend else None,
            tone=eff_tone,
            sender_name=sender_name,
            signature=signature
        )

        record.subject = wish_content["subject"]
        record.body = wish_content["body"]
        db.commit()
        db.refresh(record)

        return wish_content


wish_agent = WishAgent()
