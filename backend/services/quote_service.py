"""Quote Email Builder and Dispatch Service for WishMail AI.

Strictly preserves user-provided quotes verbatim without modification.
"""

import logging
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.database.models import Friend, FriendGroup, Quote, QuoteSchedule, EmailHistory, AppSetting
from backend.services.gmail_service import gmail_service
from backend.services.gemini_service import gemini_service

logger = logging.getLogger("wishmail.quote_service")


class QuoteService:
    """Builds and dispatches quote emails, strictly preserving quotes verbatim."""

    @staticmethod
    def format_quote_email(
        recipient_name: str,
        quote_text: str,
        author: Optional[str] = None,
        subject: Optional[str] = None,
        use_personalized_intro: bool = True,
        sender_name: str = "Kamalesh",
        signature: str = "Best wishes,\nKamalesh",
        custom_greeting: Optional[str] = None,
        custom_closing: Optional[str] = None
    ) -> Dict[str, str]:
        """Format email body while keeping the quote text EXACTLY as entered."""
        # 1. Greeting
        greeting_line = (custom_greeting or "Hi {{friend_name}},").replace("{{friend_name}}", recipient_name)
        
        # 2. Optional Introduction (polite opener)
        intro_line = "Hope you're having a wonderful day."
        if use_personalized_intro:
            intro_line = "Hope you're having a wonderful and productive day."

        # 3. Exact Quote Presentation (VERBATIM)
        # Note: Do NOT alter or paraphrase any part of quote_text
        author_suffix = f"\n— {author}" if author else ""
        quote_block = f'"{quote_text}"{author_suffix}'

        # 4. Closing & Signature
        closing_line = custom_closing or "Have a great day!"
        sig_line = signature or f"Best wishes,\n{sender_name}"

        # 5. Assemble plain text
        body = (
            f"{greeting_line}\n\n"
            f"{intro_line}\n\n"
            f"Today's thought:\n\n"
            f"{quote_block}\n\n"
            f"{closing_line}\n\n"
            f"{sig_line}"
        )

        final_subject = subject or "🌅 Today's Thought"

        return {
            "subject": final_subject,
            "body": body
        }

    @classmethod
    def get_schedule_recipients(cls, db: Session, schedule: QuoteSchedule) -> List[Friend]:
        """Resolve active recipients for a schedule (ALL, GROUP, INDIVIDUAL, MULTIPLE)."""
        active_friends = db.query(Friend).filter(
            Friend.is_active == True,
            Friend.enable_quotes == True
        )

        if schedule.recipient_type == "ALL":
            return active_friends.all()

        elif schedule.recipient_type == "GROUP" and schedule.target_group_id:
            # Query members of target group
            return active_friends.join(Friend.group_memberships).filter(
                Friend.group_memberships.any(group_id=schedule.target_group_id)
            ).all()

        elif schedule.recipient_type == "INDIVIDUAL" and schedule.target_friend_id:
            friend = active_friends.filter(Friend.id == schedule.target_friend_id).first()
            return [friend] if friend else []

        elif schedule.recipient_type == "MULTIPLE" and schedule.target_recipient_ids:
            import json
            try:
                ids = json.loads(schedule.target_recipient_ids)
                return active_friends.filter(Friend.id.in_(ids)).all()
            except Exception:
                return []

        return []

    @classmethod
    def dispatch_quote_schedule(
        cls,
        db: Session,
        schedule: QuoteSchedule,
        target_date: Optional[datetime.date] = None,
        force_send: bool = False
    ) -> Dict[str, Any]:
        """Dispatch or stage quote emails for all resolved recipients with duplicate check."""
        today = target_date or datetime.date.today()
        recipients = cls.get_schedule_recipients(db, schedule)
        quote = schedule.quote

        app_setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
        sender_name = app_setting.sender_name if app_setting else "Kamalesh"
        signature = app_setting.email_signature if app_setting else "Best wishes,\nKamalesh"
        auto_send = app_setting.auto_send_quotes if app_setting else True

        results = {
            "schedule_id": schedule.id,
            "quote_id": quote.id,
            "total_recipients": len(recipients),
            "sent": [],
            "pending": [],
            "skipped": [],
            "failed": []
        }

        for friend in recipients:
            # Duplicate check: (quote_schedule_id, recipient_email, sent_date)
            existing = db.query(EmailHistory).filter(
                EmailHistory.quote_schedule_id == schedule.id,
                EmailHistory.recipient_email == friend.email,
                EmailHistory.sent_date == today
            ).first()

            if existing:
                if existing.status == "SENT":
                    results["skipped"].append({"friend": friend.name, "reason": "Already sent today"})
                    continue
                elif existing.status == "PENDING" and not force_send:
                    results["pending"].append({"friend": friend.name, "history_id": existing.id})
                    continue

            formatted = cls.format_quote_email(
                recipient_name=friend.name,
                quote_text=quote.quote_text,
                author=quote.author,
                subject=schedule.subject,
                use_personalized_intro=schedule.personalized_intro,
                sender_name=sender_name,
                signature=signature,
                custom_greeting=app_setting.default_quote_greeting if app_setting else None,
                custom_closing=app_setting.default_quote_closing if app_setting else None
            )

            status = "PENDING"
            gmail_msg_id = None
            error_msg = None
            sent_time_str = datetime.datetime.now().strftime("%I:%M %p")

            # If auto-send is enabled or force_send requested
            if auto_send or force_send:
                try:
                    send_resp = gmail_service.send_email(
                        to_email=friend.email,
                        subject=formatted["subject"],
                        body_text=formatted["body"]
                    )
                    gmail_msg_id = send_resp.get("message_id")
                    status = "SENT"
                    results["sent"].append({"friend": friend.name, "email": friend.email})
                except Exception as e:
                    logger.error(f"Failed sending quote to {friend.email}: {e}")
                    status = "FAILED"
                    error_msg = str(e)
                    results["failed"].append({"friend": friend.name, "error": str(e)})
            else:
                results["pending"].append({"friend": friend.name, "email": friend.email})

            if existing:
                existing.status = status
                existing.gmail_message_id = gmail_msg_id
                existing.error_message = error_msg
                existing.sent_time = sent_time_str
                db.commit()
            else:
                history_entry = EmailHistory(
                    recipient_name=friend.name,
                    recipient_email=friend.email,
                    email_type="QUOTE",
                    quote_id=quote.id,
                    quote_schedule_id=schedule.id,
                    friend_id=friend.id,
                    subject=formatted["subject"],
                    body=formatted["body"],
                    sent_date=today,
                    sent_time=sent_time_str,
                    status=status,
                    gmail_message_id=gmail_msg_id,
                    error_message=error_msg
                )
                db.add(history_entry)
                db.commit()

        # Update schedule status
        if len(results["sent"]) > 0:
            schedule.status = "SENT"
        elif len(results["failed"]) > 0 and len(results["sent"]) == 0:
            schedule.status = "FAILED"
        db.commit()

        return results


quote_service = QuoteService()
