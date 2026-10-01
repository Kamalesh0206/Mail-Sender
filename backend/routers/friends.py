"""Friends & Contacts Management Endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from backend.database.session import get_db
from backend.database.models import Friend
from backend.schemas.schemas import FriendCreate, FriendUpdate, FriendResponse

router = APIRouter(prefix="/friends", tags=["Friends Management"])


@router.get("", response_model=List[FriendResponse])
def get_friends(
    search: Optional[str] = Query(None, description="Search by name or email"),
    occasion: Optional[str] = Query(None, description="Filter by occasion type"),
    relationship: Optional[str] = Query(None, description="Filter by relationship"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """List all friends with optional search and filters."""
    query = db.query(Friend)
    
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Friend.name.ilike(search_fmt)) | (Friend.email.ilike(search_fmt)))
    
    if occasion:
        query = query.filter(Friend.occasion_type == occasion)
        
    if relationship:
        query = query.filter(Friend.relationship_type == relationship)
        
    if is_active is not None:
        query = query.filter(Friend.is_active == is_active)
        
    return query.order_by(Friend.birth_month.asc(), Friend.birth_day.asc()).all()


@router.post("", response_model=FriendResponse, status_code=status.HTTP_201_CREATED)
def create_friend(payload: FriendCreate, db: Session = Depends(get_db)):
    """Add a new friend / contact for automated wishes."""
    # Check if friend with same email and occasion already exists
    existing = db.query(Friend).filter(
        Friend.email == payload.email,
        Friend.occasion_type == payload.occasion_type
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A contact with email '{payload.email}' and occasion '{payload.occasion_type}' already exists."
        )

    # Optional birth date parsing
    birth_date_obj = None
    if payload.birth_date:
        try:
            birth_date_obj = datetime.date.fromisoformat(payload.birth_date)
        except ValueError:
            pass

    new_friend = Friend(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        birth_date=birth_date_obj,
        birth_month=payload.birth_month,
        birth_day=payload.birth_day,
        birth_year=payload.birth_year,
        occasion_type=payload.occasion_type,
        relationship_type=payload.relationship_type,
        personal_notes=payload.personal_notes,
        preferred_tone=payload.preferred_tone,
        is_active=payload.is_active
    )
    db.add(new_friend)
    db.commit()
    db.refresh(new_friend)
    return new_friend


@router.get("/{friend_id}", response_model=FriendResponse)
def get_friend(friend_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a specific friend."""
    friend = db.query(Friend).filter(Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend


@router.put("/{friend_id}", response_model=FriendResponse)
def update_friend(friend_id: int, payload: FriendUpdate, db: Session = Depends(get_db)):
    """Update details of a friend."""
    friend = db.query(Friend).filter(Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")

    update_data = payload.model_dump(exclude_unset=True)
    
    if "email" in update_data and update_data["email"]:
        update_data["email"] = str(update_data["email"]).lower().strip()
        
    if "name" in update_data and update_data["name"]:
        update_data["name"] = str(update_data["name"]).strip()

    for key, value in update_data.items():
        setattr(friend, key, value)

    db.commit()
    db.refresh(friend)
    return friend


@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_friend(friend_id: int, db: Session = Depends(get_db)):
    """Delete a friend and their related wishes history."""
    friend = db.query(Friend).filter(Friend.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")

    db.delete(friend)
    db.commit()
    return None
