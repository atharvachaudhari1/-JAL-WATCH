import io
import csv
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.api.deps import get_current_official
from app.models.entities import User, Alert, Complaint, Connection
from app.services.complaints import CATEGORY_LABELS, STATUS_LABELS

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/alerts.csv")
def export_alerts_csv(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    since = datetime.now(timezone.utc) - timedelta(days=days)

    alerts = db.query(Alert).filter(
        Alert.gram_panchayat_id == gp_id,
        Alert.triggered_at >= since
    ).order_by(desc(Alert.triggered_at)).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Alert ID",
        "FHTC ID",
        "Village / Ward",
        "Alert Type",
        "Severity",
        "Title",
        "Reason / Evidence",
        "Triggered At (UTC)",
        "Status",
        "Assigned Official",
        "Resolved At (UTC)",
        "Resolution Note"
    ])

    for a in alerts:
        fhtc = a.connection.fhtc_id if a.connection else "N/A"
        ward = a.connection.village_or_ward if a.connection else "N/A"
        assignee = a.assignee.name if a.assignee else "Unassigned"
        writer.writerow([
            a.id,
            fhtc,
            ward,
            a.alert_type,
            a.severity,
            a.title,
            a.reason,
            a.triggered_at.isoformat() if a.triggered_at else "",
            a.status,
            assignee,
            a.resolved_at.isoformat() if a.resolved_at else "",
            a.resolution_note or ""
        ])

    csv_data = output.getvalue()
    filename = f"jalwatch_alerts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/complaints.csv")
def export_complaints_csv(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    since = datetime.now(timezone.utc) - timedelta(days=days)

    complaints = db.query(Complaint).filter(
        Complaint.gram_panchayat_id == gp_id,
        Complaint.created_at >= since
    ).order_by(desc(Complaint.created_at)).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Complaint Reference",
        "FHTC ID",
        "Village / Ward",
        "Category",
        "Description",
        "Created At (UTC)",
        "Status",
        "Assigned Staff",
        "Public Status Message",
        "Resolved At (UTC)"
    ])

    for c in complaints:
        fhtc = c.connection.fhtc_id if c.connection else "Unlinked"
        ward = c.connection.village_or_ward if c.connection else "N/A"
        assignee = c.assignee.name if c.assignee else "Unassigned"
        cat_label = CATEGORY_LABELS.get(c.category, c.category)
        stat_label = STATUS_LABELS.get(c.status, c.status)

        writer.writerow([
            c.public_reference,
            fhtc,
            ward,
            cat_label,
            c.description,
            c.created_at.isoformat() if c.created_at else "",
            stat_label,
            assignee,
            c.public_status_message or "",
            c.resolved_at.isoformat() if c.resolved_at else ""
        ])

    csv_data = output.getvalue()
    filename = f"jalwatch_complaints_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/metrics")
def get_report_metrics(
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"

    # Alerts breakdown by type
    alerts = db.query(Alert).filter(Alert.gram_panchayat_id == gp_id).all()
    alert_types = {}
    for a in alerts:
        alert_types[a.alert_type] = alert_types.get(a.alert_type, 0) + 1

    # Complaints breakdown by category
    complaints = db.query(Complaint).filter(Complaint.gram_panchayat_id == gp_id).all()
    cat_counts = {}
    for c in complaints:
        lbl = CATEGORY_LABELS.get(c.category, c.category)
        cat_counts[lbl] = cat_counts.get(lbl, 0) + 1

    return {
        "total_alerts_recorded": len(alerts),
        "alerts_by_type": alert_types,
        "total_complaints_recorded": len(complaints),
        "complaints_by_category": cat_counts
    }
