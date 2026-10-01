"""Background Scheduler for Automated Daily Scans (Wishes + Quotes) in Asia/Kolkata."""

import logging
import datetime
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.config.settings import settings
from backend.database.session import get_db_context
from backend.database.models import AppSetting, QuoteSchedule
from backend.agents.wish_agent import WishAgent
from backend.services.quote_service import quote_service

logger = logging.getLogger("wishmail.scheduler")

# Configured for Asia/Kolkata timezone
DEFAULT_TZ = pytz.timezone("Asia/Kolkata")
scheduler = AsyncIOScheduler(timezone=DEFAULT_TZ)
JOB_ID = "daily_wishmail_scan_job"


def scheduled_daily_task():
    """Job executed by APScheduler:
    1. Checks today's wishes.
    2. Checks today's scheduled quotes.
    3. Generates required wish emails.
    4. Prepares quote emails.
    5. Checks approval status.
    6. Sends approved/automatic emails.
    7. Records email results.
    """
    logger.info("Executing scheduled WishMail scan (Asia/Kolkata)...")
    try:
        with get_db_context() as db:
            # Current date in Asia/Kolkata
            kolkata_now = datetime.datetime.now(DEFAULT_TZ)
            today = kolkata_now.date()

            # 1. Process Wishes
            wish_results = WishAgent.run_daily_check(db, target_date=today)
            logger.info(f"Wishes scan result: {wish_results}")

            # 2. Process Scheduled Quotes
            today_quotes = db.query(QuoteSchedule).filter(
                QuoteSchedule.send_date == today,
                QuoteSchedule.status == "SCHEDULED"
            ).all()

            logger.info(f"Found {len(today_quotes)} scheduled quote broadcast(s) for {today}")
            for qs in today_quotes:
                quote_res = quote_service.dispatch_quote_schedule(db, qs, target_date=today)
                logger.info(f"Dispatched quote schedule #{qs.id}: {quote_res}")

    except Exception as e:
        logger.error(f"Error during scheduled scan: {e}", exc_info=True)


def parse_time_string(time_str: str) -> tuple[int, int]:
    """Parse 'HH:MM' string to (hour, minute)."""
    try:
        parts = time_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        return hour, minute
    except Exception:
        return settings.DEFAULT_DAILY_HOUR, settings.DEFAULT_DAILY_MINUTE


def start_scheduler():
    """Start APScheduler in Asia/Kolkata timezone."""
    if scheduler.running:
        logger.info("Scheduler already active.")
        return

    hour = settings.DEFAULT_DAILY_HOUR
    minute = settings.DEFAULT_DAILY_MINUTE

    try:
        with get_db_context() as db:
            app_setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
            if app_setting and app_setting.default_send_time:
                hour, minute = parse_time_string(app_setting.default_send_time)
    except Exception as e:
        logger.warning(f"Could not load custom schedule time from DB, using default ({hour}:{minute}): {e}")

    trigger = CronTrigger(hour=hour, minute=minute, timezone=DEFAULT_TZ)
    scheduler.add_job(
        scheduled_daily_task,
        trigger=trigger,
        id=JOB_ID,
        name="WishMail Daily Wishes & Quotes Dispatcher",
        replace_existing=True
    )
    scheduler.start()
    logger.info(f"WishMail APScheduler started in Asia/Kolkata. Daily scan set for {hour:02d}:{minute:02d}.")


def reschedule_daily_job(time_str: str):
    """Reschedule the daily job dynamically when user updates settings."""
    hour, minute = parse_time_string(time_str)
    if scheduler.running:
        trigger = CronTrigger(hour=hour, minute=minute, timezone=DEFAULT_TZ)
        scheduler.reschedule_job(JOB_ID, trigger=trigger)
        logger.info(f"Rescheduled daily scan job to {hour:02d}:{minute:02d} (Asia/Kolkata).")


def shutdown_scheduler():
    """Gracefully shutdown scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
