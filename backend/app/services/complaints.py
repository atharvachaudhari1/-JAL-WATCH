import random
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.entities import Complaint, ComplaintEvent, User, AuditLog
from app.core.permissions import ComplaintStatus

CATEGORY_LABELS = {
    "no_water": "No Water Supply",
    "low_pressure": "Low Water Pressure",
    "intermittent": "Intermittent Supply",
    "quality": "Suspected Water Quality Issue",
    "leakage": "Visible Leakage / Wastage",
    "damaged_pipe": "Damaged Pipe / Broken Tap",
    "other": "Other Water Supply Issue",
}

STATUS_LABELS = {
    "submitted": "Submitted",
    "acknowledged": "Under Review",
    "assigned": "Assigned to Technician",
    "in_progress": "Field Work in Progress",
    "resolved": "Resolved",
    "duplicate": "Closed (Duplicate)",
    "rejected": "Rejected",
}

def generate_public_reference(db: Session) -> str:
    # Safely generate sequential or high-random reference e.g. JW-2026-000123
    current_year = datetime.now(timezone.utc).year
    count = db.query(func.count(Complaint.id)).scalar() or 0
    ref_num = 1000 + count + 1
    # Check uniqueness
    cand = f"JW-{current_year}-{ref_num:06d}"
    while db.query(Complaint).filter(Complaint.public_reference == cand).first():
        ref_num += 1
        cand = f"JW-{current_year}-{ref_num:06d}"
    return cand

def add_complaint_event(
    db: Session,
    complaint_id: str,
    event_type: str,
    actor_user: Optional[User] = None,
    actor_name: Optional[str] = None,
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    public_message: Optional[str] = None,
    internal_note: Optional[str] = None
) -> ComplaintEvent:
    name = actor_name or (actor_user.name if actor_user else "Citizen / System")
    actor_user_id = actor_user.id if actor_user else None

    event = ComplaintEvent(
        complaint_id=complaint_id,
        actor_user_id=actor_user_id,
        actor_name=name,
        event_type=event_type,
        old_status=old_status,
        new_status=new_status,
        public_message=public_message,
        internal_note=internal_note,
        created_at=datetime.now(timezone.utc)
    )
    db.add(event)
    return event
