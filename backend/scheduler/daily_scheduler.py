"""Background Scheduler for Automated Daily Wish Scans using APScheduler."""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from typing import Optional

from backend.config.settings import settings
from backend.database.session import get_db_context
from backend.database.models import AppSetting
from backend.agents.wish_agent import WishAgent

logger = logging.getLogger("email_agent.scheduler")

scheduler = AsyncIOScheduler()
JOB_ID = "daily_wishes_scan_job"


def scheduled_daily_task():
    """Job executed by the scheduler at the configured time."""
    logger.info("Executing scheduled daily occasion scan...")
    try:
        with get_db_context() as db:
            result = WishAgent.run_daily_check(db)
            logger.info(f"Daily scan finished: {result}")
    except Exception as e:
        logger.error(f"Error during scheduled daily scan: {e}", exc_info=True)


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
    """Start the APScheduler if not already running."""
    if scheduler.running:
        logger.info("Scheduler already active.")
        return

    # Check database for configured send time
    hour = settings.DEFAULT_DAILY_HOUR
    minute = settings.DEFAULT_DAILY_MINUTE

    try:
        with get_db_context() as db:
            app_setting = db.query(AppSetting).filter(AppSetting.id == 1).first()
            if app_setting and app_setting.daily_send_time:
                hour, minute = parse_time_string(app_setting.daily_send_time)
    except Exception as e:
        logger.warning(f"Could not load custom schedule time from DB, using default ({hour}:{minute}): {e}")

    # Add daily cron trigger
    trigger = CronTrigger(hour=hour, minute=minute)
    scheduler.add_job(
        scheduled_daily_task,
        trigger=trigger,
        id=JOB_ID,
        name="Daily Occasion Check & Wishes Dispatch",
        replace_existing=True
    )
    scheduler.start()
    logger.info(f"APScheduler started. Daily scan scheduled for {hour:02d}:{minute:02d} local time.")


def reschedule_daily_job(time_str: str):
    """Reschedule the daily job dynamically when user updates settings."""
    hour, minute = parse_time_string(time_str)
    if scheduler.running:
        trigger = CronTrigger(hour=hour, minute=minute)
        scheduler.reschedule_job(JOB_ID, trigger=trigger)
        logger.info(f"Rescheduled daily scan job to {hour:02d}:{minute:02d}.")


def shutdown_scheduler():
    """Gracefully shutdown scheduler upon app termination."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
