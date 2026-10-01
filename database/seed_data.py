"""Seed initial sample friends and occasions into the database."""

import datetime
from backend.database.session import get_db_context, init_db
from backend.database.models import Friend, AppSetting


def seed():
    init_db()
    today = datetime.date.today()

    sample_friends = [
        {
            "name": "Arun Kumar",
            "email": "arun.tech@example.com",
            "birth_month": today.month,
            "birth_day": today.day,
            "birth_year": 1996,
            "occasion_type": "Birthday",
            "relationship_type": "Colleague",
            "personal_notes": "Loves hiking, specialty espresso, and building cool open-source projects.",
            "preferred_tone": "Friendly",
            "is_active": True
        },
        {
            "name": "Priya Sharma",
            "email": "priya.art@example.com",
            "birth_month": today.month,
            "birth_day": today.day,
            "birth_year": 1998,
            "occasion_type": "Birthday",
            "relationship_type": "Friend",
            "personal_notes": "Talented landscape photographer and dog enthusiast.",
            "preferred_tone": "Warm",
            "is_active": True
        },
        {
            "name": "Rahul Mehta",
            "email": "rahul.startup@example.com",
            "birth_month": today.month,
            "birth_day": min(today.day + 4, 28),
            "birth_year": 1992,
            "occasion_type": "Birthday",
            "relationship_type": "Mentor",
            "personal_notes": "Startup founder, avid reader, always offering insightful advice.",
            "preferred_tone": "Professional",
            "is_active": True
        },
        {
            "name": "Divya Patel",
            "email": "divya.bakes@example.com",
            "birth_month": today.month,
            "birth_day": min(today.day + 7, 28),
            "birth_year": 1997,
            "occasion_type": "Birthday",
            "relationship_type": "Friend",
            "personal_notes": "Artisan baker and marathon runner.",
            "preferred_tone": "Funny",
            "is_active": True
        },
        {
            "name": "David Chen",
            "email": "david.chen@example.com",
            "birth_month": today.month,
            "birth_day": min(today.day + 11, 28),
            "birth_year": 2021,
            "occasion_type": "Work Anniversary",
            "relationship_type": "Colleague",
            "personal_notes": "Senior staff engineer, incredible mentor to juniors.",
            "preferred_tone": "Professional",
            "is_active": True
        },
        {
            "name": "Ananya Roy",
            "email": "ananya.roy@example.com",
            "birth_month": today.month,
            "birth_day": min(today.day + 18, 28),
            "birth_year": 2019,
            "occasion_type": "Anniversary",
            "relationship_type": "Friend",
            "personal_notes": "Celebrates 5 wonderful years with Rohan.",
            "preferred_tone": "Emotional",
            "is_active": True
        }
    ]

    with get_db_context() as db:
        for item in sample_friends:
            existing = db.query(Friend).filter(Friend.email == item["email"]).first()
            if not existing:
                friend = Friend(**item)
                db.add(friend)
        db.commit()
        print("Database seeded with sample friends and occasions!")


if __name__ == "__main__":
    seed()
