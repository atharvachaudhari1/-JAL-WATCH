from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.api.deps import get_current_official
from app.models.entities import (
    User, GramPanchayat, Connection, Device, SensorReading,
    Alert, Complaint, ComplaintEvent, ThresholdSetting
)
from app.schemas.schemas import DashboardSummaryResponse, ActivityItem
from app.core.permissions import AlertStatus, AlertSeverity, ComplaintStatus
from app.core.config import settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id
    if not gp_id:
        # Fallback to first GP for system admins
        first_gp = db.query(GramPanchayat).first()
        if not first_gp:
            raise HTTPException(status_code=404, detail="No Gram Panchayat configured.")
        gp_id = first_gp.id

    gp = db.query(GramPanchayat).filter(GramPanchayat.id == gp_id).first()
    if not gp:
        raise HTTPException(status_code=404, detail="Gram Panchayat not found.")

    # Thresholds
    thresholds = db.query(ThresholdSetting).filter(ThresholdSetting.gram_panchayat_id == gp_id).first()
    stale_hours = thresholds.stale_data_hours if thresholds else 6

    now = datetime.now(timezone.utc)
    freshness_threshold = now - timedelta(hours=stale_hours)

    total_connections = db.query(func.count(Connection.id)).filter(Connection.gram_panchayat_id == gp_id).scalar() or 0

    # Active devices
    active_devices = db.query(func.count(Device.id)).join(
        Connection, Connection.device_id == Device.id
    ).filter(
        Connection.gram_panchayat_id == gp_id,
        Device.health_status.in_(["HEALTHY", "DEGRADED"])
    ).scalar() or 0

    # Connections with recent data
    # Subquery: connections that have readings after freshness_threshold
    recent_conns_count = db.query(func.count(func.distinct(SensorReading.connection_id))).join(
        Connection, Connection.id == SensorReading.connection_id
    ).filter(
        Connection.gram_panchayat_id == gp_id,
        SensorReading.observed_at >= freshness_threshold
    ).scalar() or 0

    # Active alerts
    active_alerts = db.query(func.count(Alert.id)).filter(
        Alert.gram_panchayat_id == gp_id,
        Alert.status.in_([AlertStatus.OPEN, AlertStatus.INVESTIGATING])
    ).scalar() or 0

    critical_alerts = db.query(func.count(Alert.id)).filter(
        Alert.gram_panchayat_id == gp_id,
        Alert.severity == AlertSeverity.CRITICAL,
        Alert.status == AlertStatus.OPEN
    ).scalar() or 0

    # Open complaints
    open_complaints = db.query(func.count(Complaint.id)).filter(
        Complaint.gram_panchayat_id == gp_id,
        Complaint.status.in_([ComplaintStatus.SUBMITTED, ComplaintStatus.ACKNOWLEDGED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS])
    ).scalar() or 0

    # Resolved complaints in past 30 days
    resolved_period = db.query(func.count(Complaint.id)).filter(
        Complaint.gram_panchayat_id == gp_id,
        Complaint.status == ComplaintStatus.RESOLVED,
        Complaint.resolved_at >= (now - timedelta(days=30))
    ).scalar() or 0

    # Data freshness status
    if total_connections == 0:
        freshness_status = "UNKNOWN"
    elif recent_conns_count >= (total_connections * 0.75):
        freshness_status = "FRESH"
    elif recent_conns_count > 0:
        freshness_status = "SOME_STALE"
    else:
        freshness_status = "OFFLINE"

    # Latest reading timestamp
    latest_reading = db.query(SensorReading.observed_at).join(
        Connection, Connection.id == SensorReading.connection_id
    ).filter(Connection.gram_panchayat_id == gp_id).order_by(
        desc(SensorReading.observed_at)
    ).first()

    last_sync_time = latest_reading[0] if latest_reading else None

    return DashboardSummaryResponse(
        gram_panchayat_id=gp.id,
        gram_panchayat_name=gp.name,
        district=gp.district,
        state=gp.state,
        total_connections=total_connections,
        active_devices=active_devices,
        connections_with_recent_data=recent_conns_count,
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
        open_complaints=open_complaints,
        resolved_complaints_period=resolved_period,
        data_freshness_status=freshness_status,
        last_sync_time=last_sync_time,
        is_demo_data=settings.DEMO_MODE
    )

@router.get("/activity", response_model=List[ActivityItem])
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"

    # Combine recent complaint events and recent alerts
    events = db.query(ComplaintEvent).join(
        Complaint, Complaint.id == ComplaintEvent.complaint_id
    ).filter(
        Complaint.gram_panchayat_id == gp_id
    ).order_by(desc(ComplaintEvent.created_at)).limit(limit).all()

    alerts = db.query(Alert).filter(
        Alert.gram_panchayat_id == gp_id
    ).order_by(desc(Alert.triggered_at)).limit(limit).all()

    items = []
    for ev in events:
        items.append(ActivityItem(
            id=f"ev-{ev.id}",
            type="complaint_event",
            title=f"Complaint Update: {ev.event_type.replace('_', ' ').title()}",
            description=ev.public_message or ev.internal_note or "Status updated",
            timestamp=ev.created_at,
            actor=ev.actor_name
        ))

    for al in alerts:
        items.append(ActivityItem(
            id=f"al-{al.id}",
            type="alert",
            title=f"Alert: {al.title}",
            description=al.reason,
            timestamp=al.triggered_at,
            actor="System Rule Engine"
        ))

    # Sort combined by timestamp desc
    items.sort(key=lambda x: x.timestamp, reverse=True)
    return items[:limit]
