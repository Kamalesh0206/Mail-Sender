"""Friends & Contacts Management Endpoints for WishMail AI."""

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import datetime

from backend.database.session import get_db
from backend.database.models import Friend, FriendGroup, FriendGroupMember, Occasion
from backend.schemas.schemas import FriendCreate, FriendUpdate, FriendResponse

router = APIRouter(prefix="/friends", tags=["Friends & Groups"])


def parse_month_day(date_text: Optional[str]) -> tuple[Optional[int], Optional[int], Optional[int]]:
    """Parse strings like '05 October', '1995-10-05', or '10-05' to (month, day, year)."""
    if not date_text or not date_text.strip():
        return None, None, None
    
    text = date_text.strip()
    
    # Try ISO YYYY-MM-DD
    if "-" in text:
        parts = text.split("-")
        if len(parts) == 3:
            try:
                return int(parts[1]), int(parts[2]), int(parts[0])
            except ValueError:
                pass
        elif len(parts) == 2:
            try:
                return int(parts[0]), int(parts[1]), None
            except ValueError:
                pass

    # Try "05 October" or "October 05"
    for fmt in ("%d %B", "%d %b", "%B %d", "%b %d", "%d/%m", "%m/%d"):
        try:
            dt = datetime.datetime.strptime(text, fmt)
            return dt.month, dt.day, None
        except ValueError:
            continue

    return None, None, None


@router.get("", response_model=List[FriendResponse])
def get_friends(
    search: Optional[str] = Query(None, description="Search by name, email, or notes"),
    relationship: Optional[str] = Query(None, description="Filter by relationship"),
    group_id: Optional[int] = Query(None, description="Filter by group ID"),
    is_active: Optional[bool] = Query(None, description="Filter active status"),
    db: Session = Depends(get_db)
):
    """Retrieve list of friends with associated groups and occasion preferences."""
    query = db.query(Friend)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Friend.name.ilike(search_fmt)) | (Friend.email.ilike(search_fmt)))
    if relationship:
        query = query.filter(Friend.relationship == relationship)
    if is_active is not None:
        query = query.filter(Friend.is_active == is_active)
    if group_id:
        query = query.join(FriendGroupMember).filter(FriendGroupMember.group_id == group_id)

    friends = query.order_by(Friend.name.asc()).all()
    results = []
    for f in friends:
        grp_names = [m.group.name for m in f.group_memberships if m.group]
        res = FriendResponse.model_validate(f)
        res.groups = grp_names
        results.append(res)
    return results


@router.post("", response_model=FriendResponse, status_code=status.HTTP_201_CREATED)
def create_friend(payload: FriendCreate, db: Session = Depends(get_db)):
    """Add a friend and automatically configure occasions for Birthday/Anniversary."""
    existing = db.query(Friend).filter(Friend.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A friend with email '{payload.email}' already exists."
        )

    # Parse month and day for birthday
    b_month = payload.birth_month
    b_day = payload.birth_day
    b_year = payload.birth_year
    if payload.birthday and (not b_month or not b_day):
        bm, bd, by = parse_month_day(payload.birthday)
        b_month = bm or b_month
        b_day = bd or b_day
        b_year = by or b_year

    # Parse month and day for anniversary
    a_month = payload.anniversary_month
    a_day = payload.anniversary_day
    a_year = payload.anniversary_year
    if payload.anniversary and (not a_month or not a_day):
        am, ad, ay = parse_month_day(payload.anniversary)
        a_month = am or a_month
        a_day = ad or a_day
        a_year = ay or a_year

    friend = Friend(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        birthday=payload.birthday or (f"{b_day:02d} {datetime.date(2000, b_month, 1).strftime('%B')}" if (b_month and b_day) else None),
        birth_month=b_month,
        birth_day=b_day,
        birth_year=b_year,
        anniversary=payload.anniversary or (f"{a_day:02d} {datetime.date(2000, a_month, 1).strftime('%B')}" if (a_month and a_day) else None),
        anniversary_month=a_month,
        anniversary_day=a_day,
        anniversary_year=a_year,
        relationship=payload.relationship,
        personal_notes=payload.personal_notes,
        is_active=payload.is_active,
        enable_wishes=payload.enable_wishes,
        enable_quotes=payload.enable_quotes
    )
    db.add(friend)
    db.commit()
    db.refresh(friend)

    # Associate groups
    if payload.group_ids:
        for gid in payload.group_ids:
            db.add(FriendGroupMember(friend_id=friend.id, group_id=gid))

    # Auto-create Birthday occasion if provided
    if b_month and b_day:
        occ_bday = Occasion(
            friend_id=friend.id,
            occasion_type="Birthday",
            title=f"{friend.name}'s Birthday",
            date_str=friend.birthday or f"{b_day:02d} October",
            month=b_month,
            day=b_day,
            year=b_year,
            notes=friend.personal_notes,
            is_active=friend.enable_wishes
        )
        db.add(occ_bday)

    # Auto-create Anniversary occasion if provided
    if a_month and a_day:
        occ_anni = Occasion(
            friend_id=friend.id,
            occasion_type="Anniversary",
            title=f"{friend.name}'s Anniversary",
            date_str=friend.anniversary or f"{a_day:02d} December",
            month=a_month,
            day=a_day,
            year=a_year,
            notes=friend.personal_notes,
            is_active=friend.enable_wishes
        )
        db.add(occ_anni)

    db.commit()
    db.refresh(friend)

    grp_names = [m.group.name for m in friend.group_memberships if m.group]
    res = FriendResponse.model_validate(friend)
    res.groups = grp_names
    return res


@router.put("/{friend_id}", response_model=FriendResponse)
def update_friend(friend_id: int, payload: FriendUpdate, db: Session = Depends(get_db)):
    """Update details of a friend."""
    friend = db.query(Friend).filter(Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")

    data = payload.model_dump(exclude_unset=True)
    group_ids = data.pop("group_ids", None)

    for k, v in data.items():
        setattr(friend, k, v)

    # Update group memberships if provided
    if group_ids is not None:
        db.query(FriendGroupMember).filter(FriendGroupMember.friend_id == friend.id).delete()
        for gid in group_ids:
            db.add(FriendGroupMember(friend_id=friend.id, group_id=gid))

    db.commit()
    db.refresh(friend)

    grp_names = [m.group.name for m in friend.group_memberships if m.group]
    res = FriendResponse.model_validate(friend)
    res.groups = grp_names
    return res


@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_friend(friend_id: int, db: Session = Depends(get_db)):
    """Delete a friend, occasions, and memberships."""
    friend = db.query(Friend).filter(Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    db.delete(friend)
    db.commit()
    return None


@router.get("/export")
def export_friends_csv(db: Session = Depends(get_db)):
    """Export friends as a CSV file."""
    friends = db.query(Friend).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Name", "Email", "Birthday", "Anniversary", "Relationship", "Groups", "Personal Notes", "Active", "Enable Wishes", "Enable Quotes"
    ])
    for f in friends:
        grps = ";".join([m.group.name for m in f.group_memberships if m.group])
        writer.writerow([
            f.name, f.email, f.birthday or "", f.anniversary or "", f.relationship, grps, f.personal_notes or "",
            "Yes" if f.is_active else "No", "Yes" if f.enable_wishes else "No", "Yes" if f.enable_quotes else "No"
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wishmail_friends.csv"}
    )
