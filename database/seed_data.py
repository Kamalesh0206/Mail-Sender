"""Seed comprehensive initial sample data for WishMail AI."""

import datetime
from backend.database.session import get_db_context, init_db
from backend.database.models import Friend, FriendGroup, FriendGroupMember, Occasion, Quote, QuoteSchedule, EmailHistory, AppSetting


def seed():
    init_db()
    today = datetime.date.today()

    with get_db_context() as db:
        # 1. Fetch Groups
        groups = {g.name: g for g in db.query(FriendGroup).all()}

        # 2. Sample Friends
        sample_friends = [
            {
                "name": "Arun Kumar",
                "email": "arun@gmail.com",
                "birthday": f"{today.day:02d} {today.strftime('%B')}",
                "birth_month": today.month,
                "birth_day": today.day,
                "birth_year": 1995,
                "anniversary": "12 December",
                "anniversary_month": 12,
                "anniversary_day": 12,
                "anniversary_year": 2021,
                "relationship": "Close Friend",
                "personal_notes": "Works as a software engineer and likes technology.",
                "group_names": ["Close Friends", "College Friends", "All Friends"]
            },
            {
                "name": "Priya Sharma",
                "email": "priya@gmail.com",
                "birthday": f"{today.day:02d} {today.strftime('%B')}",
                "birth_month": today.month,
                "birth_day": today.day,
                "birth_year": 1997,
                "anniversary": "18 October",
                "anniversary_month": 10,
                "anniversary_day": 18,
                "relationship": "Close Friend",
                "personal_notes": "Designer, loves landscape photography and tea.",
                "group_names": ["Close Friends", "All Friends"]
            },
            {
                "name": "Rahul Mehta",
                "email": "rahul@gmail.com",
                "birthday": "08 October",
                "birth_month": 10,
                "birth_day": 8,
                "birth_year": 1992,
                "relationship": "Office Friends",
                "personal_notes": "Startup mentor, avid reader, coffee fanatic.",
                "group_names": ["Office Friends", "All Friends"]
            },
            {
                "name": "Divya Patel",
                "email": "divya@gmail.com",
                "birthday": "15 October",
                "birth_month": 10,
                "birth_day": 15,
                "birth_year": 1996,
                "relationship": "Family",
                "personal_notes": "Loves baking and marathon running.",
                "group_names": ["Family", "All Friends"]
            }
        ]

        created_friends = []
        for item in sample_friends:
            grp_names = item.pop("group_names")
            existing = db.query(Friend).filter(Friend.email == item["email"]).first()
            if not existing:
                friend = Friend(**item)
                db.add(friend)
                db.commit()
                db.refresh(friend)

                # Add to groups
                for gname in grp_names:
                    if gname in groups:
                        db.add(FriendGroupMember(friend_id=friend.id, group_id=groups[gname].id))

                # Add Occasions
                if friend.birth_month and friend.birth_day:
                    db.add(Occasion(
                        friend_id=friend.id,
                        occasion_type="Birthday",
                        title=f"{friend.name}'s Birthday",
                        date_str=friend.birthday or "05 October",
                        month=friend.birth_month,
                        day=friend.birth_day,
                        year=friend.birth_year,
                        notes=friend.personal_notes
                    ))

                if friend.anniversary_month and friend.anniversary_day:
                    db.add(Occasion(
                        friend_id=friend.id,
                        occasion_type="Anniversary",
                        title=f"{friend.name}'s Anniversary",
                        date_str=friend.anniversary or "12 December",
                        month=friend.anniversary_month,
                        day=friend.anniversary_day,
                        year=friend.anniversary_year,
                        notes=friend.personal_notes
                    ))

                db.commit()
                created_friends.append(friend)
            else:
                created_friends.append(existing)

        # 3. Sample Quotes (verbatim)
        sample_quotes = [
            ("Success is built one small step at a time.", "Unknown", "Success"),
            ("Every day is a new opportunity to become better.", "Marcus Aurelius", "Motivation"),
            ("Happiness is not by chance, but by choice.", "Jim Rohn", "Inspiration"),
            ("The journey of a thousand miles begins with a single step.", "Lao Tzu", "Wisdom")
        ]

        created_quotes = []
        for text, author, cat in sample_quotes:
            existing_q = db.query(Quote).filter(Quote.quote_text == text).first()
            if not existing_q:
                q = Quote(quote_text=text, author=author, category=cat)
                db.add(q)
                db.commit()
                db.refresh(q)
                created_quotes.append(q)
            else:
                created_quotes.append(existing_q)

        # 4. Sample Schedules
        if created_quotes:
            # Schedule today's quote broadcast
            existing_sc1 = db.query(QuoteSchedule).filter(QuoteSchedule.send_date == today).first()
            if not existing_sc1:
                sc1 = QuoteSchedule(
                    quote_id=created_quotes[0].id,
                    send_date=today,
                    send_time="09:00",
                    recipient_type="ALL",
                    subject="🌅 Today's Thought",
                    status="SCHEDULED"
                )
                db.add(sc1)

            # Schedule tomorrow's quote
            tomorrow = today + datetime.timedelta(days=1)
            existing_sc2 = db.query(QuoteSchedule).filter(QuoteSchedule.send_date == tomorrow).first()
            if not existing_sc2 and len(created_quotes) > 1:
                close_grp = groups.get("Close Friends")
                sc2 = QuoteSchedule(
                    quote_id=created_quotes[1].id,
                    send_date=tomorrow,
                    send_time="08:00",
                    recipient_type="GROUP" if close_grp else "ALL",
                    target_group_id=close_grp.id if close_grp else None,
                    subject="Daily Inspiration",
                    status="SCHEDULED"
                )
                db.add(sc2)

            db.commit()

        print("WishMail AI database seeded successfully with friends, groups, occasions, and quotes!")


if __name__ == "__main__":
    seed()
