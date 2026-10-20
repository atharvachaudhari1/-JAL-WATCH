import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.api.deps import get_current_official
from app.models.entities import User, Alert, Connection, AuditLog
from app.schemas.schemas import AlertResponse, AlertAcknowledgeRequest, AlertAssignRequest, AlertResolveRequest
from app.core.permissions import AlertStatus

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    query = db.query(Alert).filter(Alert.gram_panchayat_id == gp_id)

    if status:
        query = query.filter(Alert.status == status.lower())
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if village:
        query = query.join(Connection, Connection.id == Alert.connection_id).filter(
            Connection.village_or_ward.ilike(f"%{village}%")
        )

    alerts = query.order_by(desc(Alert.triggered_at)).limit(limit).all()

    results = []
    for a in alerts:
        try:
            ev = json.loads(a.evidence_json) if a.evidence_json else {}
        except Exception:
            ev = {}
        results.append(AlertResponse(
            id=a.id,
            connection_id=a.connection_id,
            fhtc_id=a.connection.fhtc_id if a.connection else None,
            village_or_ward=a.connection.village_or_ward if a.connection else None,
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
    return results

@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: str,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.gram_panchayat_id == gp_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found.")

    try:
        ev = json.loads(a.evidence_json) if a.evidence_json else {}
    except Exception:
        ev = {}

    return AlertResponse(
        id=a.id,
        connection_id=a.connection_id,
        fhtc_id=a.connection.fhtc_id if a.connection else None,
        village_or_ward=a.connection.village_or_ward if a.connection else None,
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
    )

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    payload: AlertAcknowledgeRequest,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.gram_panchayat_id == gp_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found.")

    a.status = AlertStatus.ACKNOWLEDGED
    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        gram_panchayat_id=gp_id,
        action="ACKNOWLEDGE_ALERT",
        entity_type="alert",
        entity_id=a.id,
        metadata_json=json.dumps({"title": a.title, "note": payload.note})
    )
    db.add(audit)
    db.commit()
    return {"message": "Alert acknowledged successfully."}

@router.post("/{alert_id}/assign")
def assign_alert(
    alert_id: str,
    payload: AlertAssignRequest,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.gram_panchayat_id == gp_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found.")

    tech = db.query(User).filter(User.id == payload.assigned_to).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician user not found.")

    a.assigned_to = tech.id
    a.status = AlertStatus.INVESTIGATING

    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        gram_panchayat_id=gp_id,
        action="ASSIGN_ALERT",
        entity_type="alert",
        entity_id=a.id,
        metadata_json=json.dumps({"assigned_to": tech.name, "tech_id": tech.id})
    )
    db.add(audit)
    db.commit()
    return {"message": f"Alert assigned to {tech.name} for investigation."}

@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    payload: AlertResolveRequest,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    a = db.query(Alert).filter(Alert.id == alert_id, Alert.gram_panchayat_id == gp_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found.")

    a.status = AlertStatus.RESOLVED
    a.resolved_at = datetime.now(timezone.utc)
    a.resolution_note = payload.resolution_note

    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        gram_panchayat_id=gp_id,
        action="RESOLVE_ALERT",
        entity_type="alert",
        entity_id=a.id,
        metadata_json=json.dumps({"resolution_note": payload.resolution_note})
    )
    db.add(audit)
    db.commit()
    return {"message": "Alert marked resolved."}
