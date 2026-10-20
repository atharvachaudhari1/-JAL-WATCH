import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.api.deps import get_current_official
from app.models.entities import (
    User, Connection, Device, SensorReading, Alert, Complaint, ThresholdSetting
)
from app.schemas.schemas import (
    ConnectionListItem, ConnectionDetailResponse, ReadingPoint, AlertResponse, OfficialComplaintListItem
)
from app.services.alert_rules import compute_connection_status
from app.core.permissions import AlertStatus

router = APIRouter(prefix="/connections", tags=["Connections"])

@router.get("", response_model=List[ConnectionListItem])
def list_connections(
    status: Optional[str] = Query(None, description="Normal, Attention, Critical, Unknown, Offline"),
    village: Optional[str] = Query(None),
    has_device: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    query = db.query(Connection).filter(Connection.gram_panchayat_id == gp_id)

    if village:
        query = query.filter(Connection.village_or_ward.ilike(f"%{village}%"))

    if has_device is True:
        query = query.filter(Connection.device_id.isnot(None))
    elif has_device is False:
        query = query.filter(Connection.device_id.is_(None))

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (Connection.fhtc_id.ilike(search_fmt)) |
            (Connection.household_reference.ilike(search_fmt)) |
            (Connection.village_or_ward.ilike(search_fmt))
        )

    conns = query.all()

    # Get thresholds
    thresholds = db.query(ThresholdSetting).filter(ThresholdSetting.gram_panchayat_id == gp_id).first()
    stale_hours = thresholds.stale_data_hours if thresholds else 6

    items: List[ConnectionListItem] = []
    for c in conns:
        # Get latest reading
        latest_reading = db.query(SensorReading).filter(
            SensorReading.connection_id == c.id
        ).order_by(desc(SensorReading.observed_at)).first()

        # Open alerts
        open_alerts = db.query(Alert).filter(
            Alert.connection_id == c.id,
            Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING])
        ).all()

        computed_status, reason = compute_connection_status(c, latest_reading, open_alerts, stale_hours)

        if status and computed_status.lower() != status.lower():
            continue

        dev_code = c.device.device_code if c.device else None

        active_complaint = db.query(Complaint).filter(
            Complaint.connection_id == c.id,
            Complaint.status.notin_(["resolved", "duplicate", "rejected"])
        ).first() is not None

        items.append(ConnectionListItem(
            id=c.id,
            fhtc_id=c.fhtc_id,
            village_or_ward=c.village_or_ward,
            household_reference=c.household_reference,
            device_id=c.device_id,
            device_code=dev_code,
            latest_flow=latest_reading.flow_rate if latest_reading else None,
            latest_pressure=latest_reading.pressure if latest_reading else None,
            last_reading_time=latest_reading.observed_at if latest_reading else None,
            computed_status=computed_status,
            status_reason=reason,
            open_alerts_count=len(open_alerts),
            has_active_complaint=active_complaint
        ))

    return items[:limit]

@router.get("/{connection_id}", response_model=ConnectionDetailResponse)
def get_connection_detail(
    connection_id: str,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    conn = db.query(Connection).filter(
        Connection.id == connection_id,
        Connection.gram_panchayat_id == gp_id
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found or unauthorized.")

    # Thresholds
    thresholds = db.query(ThresholdSetting).filter(ThresholdSetting.gram_panchayat_id == gp_id).first()
    stale_hours = thresholds.stale_data_hours if thresholds else 6

    # Latest reading
    latest_reading = db.query(SensorReading).filter(
        SensorReading.connection_id == conn.id
    ).order_by(desc(SensorReading.observed_at)).first()

    # Open alerts
    open_alerts = db.query(Alert).filter(
        Alert.connection_id == conn.id,
        Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING])
    ).all()

    computed_status, reason = compute_connection_status(conn, latest_reading, open_alerts, stale_hours)

    # Freshness minutes
    freshness_minutes = None
    if latest_reading:
        obs = latest_reading.observed_at
        if obs.tzinfo is None:
            obs = obs.replace(tzinfo=timezone.utc)
        freshness_minutes = int((datetime.now(timezone.utc) - obs).total_seconds() / 60)

    # Recent readings for chart (last 24)
    readings = db.query(SensorReading).filter(
        SensorReading.connection_id == conn.id
    ).order_by(desc(SensorReading.observed_at)).limit(48).all()
    readings.reverse() # Chronological

    reading_points = []
    for r in readings:
        try:
            q_flags = json.loads(r.quality_flags_json) if r.quality_flags_json else []
        except Exception:
            q_flags = []
        reading_points.append(ReadingPoint(
            observed_at=r.observed_at,
            flow_rate=r.flow_rate,
            pressure=r.pressure,
            volume=r.volume,
            turbidity=r.turbidity,
            ph=r.ph,
            source=r.source,
            quality_flags=q_flags
        ))

    # Alerts
    alerts_resp = []
    for a in open_alerts:
        try:
            ev = json.loads(a.evidence_json) if a.evidence_json else {}
        except Exception:
            ev = {}
        alerts_resp.append(AlertResponse(
            id=a.id,
            connection_id=a.connection_id,
            fhtc_id=conn.fhtc_id,
            village_or_ward=conn.village_or_ward,
            alert_type=a.alert_type,
            severity=a.severity,
            title=a.title,
            reason=a.reason,
            evidence=ev,
            rule_version=a.rule_version,
            model_version=a.model_version,
            status=a.status,
            assigned_to=a.assigned_to,
            assignee_name=a.assignee.name if a.assignee else None,
            triggered_at=a.triggered_at,
            resolved_at=a.resolved_at,
            resolution_note=a.resolution_note
        ))

    # Complaints
    complaints = db.query(Complaint).filter(Complaint.connection_id == conn.id).order_by(desc(Complaint.created_at)).limit(5).all()
    complaints_resp = []
    from app.services.complaints import CATEGORY_LABELS
    for c in complaints:
        complaints_resp.append(OfficialComplaintListItem(
            id=c.id,
            public_reference=c.public_reference,
            connection_id=c.connection_id,
            fhtc_id=conn.fhtc_id,
            village_or_ward=conn.village_or_ward,
            category=c.category,
            category_label=CATEGORY_LABELS.get(c.category, c.category),
            description=c.description,
            status=c.status,
            assigned_to=c.assigned_to,
            assignee_name=c.assignee.name if c.assignee else None,
            photo_url=c.photo_url,
            created_at=c.created_at,
            updated_at=c.updated_at,
            resolved_at=c.resolved_at
        ))

    schedule_dict = None
    if conn.supply_schedule_json:
        try:
            schedule_dict = json.loads(conn.supply_schedule_json)
        except Exception:
            pass

    return ConnectionDetailResponse(
        id=conn.id,
        fhtc_id=conn.fhtc_id,
        gram_panchayat_id=conn.gram_panchayat_id,
        gram_panchayat_name=conn.gram_panchayat.name,
        village_or_ward=conn.village_or_ward,
        household_reference=conn.household_reference,
        device_id=conn.device_id,
        device_code=conn.device.device_code if conn.device else None,
        device_type=conn.device.device_type if conn.device else None,
        firmware_version=conn.device.firmware_version if conn.device else None,
        device_health=conn.device.health_status if conn.device else None,
        battery_level=conn.device.battery_level if conn.device else None,
        supply_schedule=schedule_dict,
        latest_flow=latest_reading.flow_rate if latest_reading else None,
        latest_pressure=latest_reading.pressure if latest_reading else None,
        latest_turbidity=latest_reading.turbidity if latest_reading else None,
        latest_ph=latest_reading.ph if latest_reading else None,
        last_reading_time=latest_reading.observed_at if latest_reading else None,
        computed_status=computed_status,
        status_reason=reason,
        data_freshness_minutes=freshness_minutes,
        open_alerts=alerts_resp,
        recent_complaints=complaints_resp,
        recent_readings=reading_points
    )

@router.get("/{connection_id}/readings", response_model=List[ReadingPoint])
def get_connection_readings(
    connection_id: str,
    hours: int = Query(24, ge=1, le=168),
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    conn = db.query(Connection).filter(
        Connection.id == connection_id,
        Connection.gram_panchayat_id == gp_id
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found.")

    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    readings = db.query(SensorReading).filter(
        SensorReading.connection_id == conn.id,
        SensorReading.observed_at >= since
    ).order_by(desc(SensorReading.observed_at)).limit(200).all()

    readings.reverse()

    results = []
    for r in readings:
        try:
            q_flags = json.loads(r.quality_flags_json) if r.quality_flags_json else []
        except Exception:
            q_flags = []
        results.append(ReadingPoint(
            observed_at=r.observed_at,
            flow_rate=r.flow_rate,
            pressure=r.pressure,
            volume=r.volume,
            turbidity=r.turbidity,
            ph=r.ph,
            source=r.source,
            quality_flags=q_flags
        ))
    return results
