"""Friend Groups Management Endpoints for WishMail AI."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database.session import get_db
from backend.database.models import FriendGroup, FriendGroupMember
from backend.schemas.schemas import FriendGroupCreate, FriendGroupResponse

router = APIRouter(prefix="/groups", tags=["Friend Groups"])


@router.get("", response_model=List[FriendGroupResponse])
def get_groups(db: Session = Depends(get_db)):
    """Retrieve all friend groups with member counts."""
    groups = db.query(FriendGroup).order_by(FriendGroup.name.asc()).all()
    results = []
    for g in groups:
        count = db.query(FriendGroupMember).filter(FriendGroupMember.group_id == g.id).count()
        item = FriendGroupResponse.model_validate(g)
        item.member_count = count
        results.append(item)
    return results


@router.post("", response_model=FriendGroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(payload: FriendGroupCreate, db: Session = Depends(get_db)):
    """Create a new friend group."""
    existing = db.query(FriendGroup).filter(FriendGroup.name.ilike(payload.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A group named '{payload.name}' already exists."
        )

    group = FriendGroup(
        name=payload.name.strip(),
        description=payload.description
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    item = FriendGroupResponse.model_validate(group)
    item.member_count = 0
    return item


@router.put("/{group_id}", response_model=FriendGroupResponse)
def update_group(group_id: int, payload: FriendGroupCreate, db: Session = Depends(get_db)):
    """Update a friend group name and description."""
    group = db.query(FriendGroup).filter(FriendGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    group.name = payload.name.strip()
    group.description = payload.description
    db.commit()
    db.refresh(group)

    count = db.query(FriendGroupMember).filter(FriendGroupMember.group_id == group.id).count()
    item = FriendGroupResponse.model_validate(group)
    item.member_count = count
    return item


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    """Delete a friend group."""
    group = db.query(FriendGroup).filter(FriendGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    db.delete(group)
    db.commit()
    return None
