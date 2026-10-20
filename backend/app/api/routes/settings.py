import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_official, get_current_admin
from app.models.entities import User, ThresholdSetting, AuditLog
from app.schemas.schemas import ThresholdSettingsResponse, ThresholdSettingsUpdate
from app.core.permissions import UserRole

router = APIRouter(prefix="/settings", tags=["Settings & Thresholds"])

@router.get("/thresholds", response_model=ThresholdSettingsResponse)
def get_threshold_settings(
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    thresholds = db.query(ThresholdSetting).filter(ThresholdSetting.gram_panchayat_id == gp_id).first()

    if not thresholds:
        thresholds = ThresholdSetting(
            gram_panchayat_id=gp_id,
            min_flow_lpm=2.0,
            min_pressure_bar=0.7,
            max_pressure_bar=3.0,
            stale_data_hours=6,
            supply_window_start="06:00",
            supply_window_end="09:00",
            evening_window_start="17:30",
            evening_window_end="20:00"
        )
        db.add(thresholds)
        db.commit()

    return thresholds

@router.put("/thresholds", response_model=ThresholdSettingsResponse)
def update_threshold_settings(
    payload: ThresholdSettingsUpdate,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    thresholds = db.query(ThresholdSetting).filter(ThresholdSetting.gram_panchayat_id == gp_id).first()

    if not thresholds:
        thresholds = ThresholdSetting(gram_panchayat_id=gp_id)
        db.add(thresholds)

    old_values = {
        "min_flow_lpm": thresholds.min_flow_lpm,
        "min_pressure_bar": thresholds.min_pressure_bar,
        "max_pressure_bar": thresholds.max_pressure_bar,
        "stale_data_hours": thresholds.stale_data_hours,
        "supply_window_start": thresholds.supply_window_start,
        "supply_window_end": thresholds.supply_window_end
    }

    if payload.min_flow_lpm is not None:
        thresholds.min_flow_lpm = payload.min_flow_lpm
    if payload.min_pressure_bar is not None:
        thresholds.min_pressure_bar = payload.min_pressure_bar
    if payload.max_pressure_bar is not None:
        thresholds.max_pressure_bar = payload.max_pressure_bar
    if payload.stale_data_hours is not None:
        thresholds.stale_data_hours = payload.stale_data_hours
    if payload.supply_window_start is not None:
        thresholds.supply_window_start = payload.supply_window_start
    if payload.supply_window_end is not None:
        thresholds.supply_window_end = payload.supply_window_end
    if payload.evening_window_start is not None:
        thresholds.evening_window_start = payload.evening_window_start
    if payload.evening_window_end is not None:
        thresholds.evening_window_end = payload.evening_window_end

    thresholds.updated_at = datetime.now(timezone.utc)
    thresholds.updated_by = current_user.name

    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        gram_panchayat_id=gp_id,
        action="UPDATE_THRESHOLDS",
        entity_type="threshold_setting",
        entity_id=thresholds.id,
        metadata_json=json.dumps({"old": old_values, "new": payload.model_dump(exclude_unset=True)})
    )
    db.add(audit)
    db.commit()

    return thresholds

@router.get("/staff")
def list_staff_members(
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    staff = db.query(User).filter(
        User.gram_panchayat_id == gp_id,
        User.is_active == True
    ).all()

    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "phone": u.phone
        }
        for u in staff
    ]
