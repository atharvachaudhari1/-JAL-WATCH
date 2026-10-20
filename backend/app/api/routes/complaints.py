import os
import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.api.deps import get_current_official
from app.models.entities import User, Complaint, ComplaintEvent, Connection, GramPanchayat, AuditLog
from app.schemas.schemas import (
    PublicComplaintCreate, PublicComplaintTrackRequest, PublicComplaintResponse,
    ComplaintEventItem, OfficialComplaintListItem, OfficialComplaintDetail,
    ComplaintAssignRequest, ComplaintStatusUpdateRequest, ComplaintFollowUpRequest
)
from app.services.complaints import (
    generate_public_reference, add_complaint_event, CATEGORY_LABELS, STATUS_LABELS
)
from app.core.permissions import ComplaintStatus
from app.core.config import settings

router = APIRouter(tags=["Complaints"])

# ----------------- PUBLIC VILLAGER ROUTES -----------------

@router.post("/public/complaints", response_model=PublicComplaintResponse)
def submit_public_complaint(
    payload: PublicComplaintCreate,
    db: Session = Depends(get_db)
):
    # Resolve Gram Panchayat
    gp_id = payload.gram_panchayat_id
    conn = None

    if payload.connection_id_or_fhtc:
        cid = payload.connection_id_or_fhtc.strip()
        conn = db.query(Connection).filter(
            (Connection.fhtc_id.ilike(cid)) | (Connection.id == cid)
        ).first()
        if conn:
            gp_id = conn.gram_panchayat_id

    if not gp_id:
        # Fallback to demo default GP
        first_gp = db.query(GramPanchayat).first()
        if first_gp:
            gp_id = first_gp.id
        else:
            raise HTTPException(status_code=400, detail="Unable to determine Gram Panchayat for complaint submission.")

    pub_ref = generate_public_reference(db)

    complaint = Complaint(
        public_reference=pub_ref,
        connection_id=conn.id if conn else None,
        gram_panchayat_id=gp_id,
        category=payload.category,
        description=payload.description,
        started_at_approx=payload.started_at_approx,
        private_contact_phone=payload.contact_phone,
        private_contact_name=payload.contact_name,
        status=ComplaintStatus.SUBMITTED,
        public_status_message="Your grievance has been successfully submitted and queued for Gram Panchayat review.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(complaint)
    db.flush()

    # Create submission event
    add_complaint_event(
        db=db,
        complaint_id=complaint.id,
        event_type="citizen_submission",
        actor_name="Citizen Resident",
        new_status=ComplaintStatus.SUBMITTED,
        public_message="Grievance logged via JalWatch Villager Portal."
    )

    db.commit()

    return PublicComplaintResponse(
        public_reference=complaint.public_reference,
        category=complaint.category,
        category_label=CATEGORY_LABELS.get(complaint.category, complaint.category),
        village_or_ward=conn.village_or_ward if conn else None,
        status=complaint.status,
        status_label=STATUS_LABELS.get(complaint.status, complaint.status),
        public_status_message=complaint.public_status_message,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        events=[ComplaintEventItem(
            id="ev-sub",
            event_type="citizen_submission",
            actor_name="Citizen Resident",
            public_message="Grievance logged via JalWatch Villager Portal.",
            created_at=complaint.created_at
        )]
    )

@router.post("/public/complaints/track", response_model=PublicComplaintResponse)
def track_public_complaint(
    payload: PublicComplaintTrackRequest,
    db: Session = Depends(get_db)
):
    ref = payload.public_reference.strip().upper()
    complaint = db.query(Complaint).filter(Complaint.public_reference == ref).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="No complaint found matching reference number. Please check the ticket format (e.g. JW-2026-000101).")

    # Optional verification if phone provided
    if payload.contact_phone and complaint.private_contact_phone:
        p_clean = payload.contact_phone.strip()[-10:]
        cp_clean = complaint.private_contact_phone.strip()[-10:]
        if p_clean != cp_clean:
            raise HTTPException(status_code=403, detail="Contact phone number does not match record for this ticket.")

    village = complaint.connection.village_or_ward if complaint.connection else None

    # Only include events with public messages
    public_events = []
    for ev in complaint.events:
        if ev.public_message:
            public_events.append(ComplaintEventItem(
                id=ev.id,
                event_type=ev.event_type,
                actor_name=ev.actor_name,
                public_message=ev.public_message,
                created_at=ev.created_at
            ))

    return PublicComplaintResponse(
        public_reference=complaint.public_reference,
        category=complaint.category,
        category_label=CATEGORY_LABELS.get(complaint.category, complaint.category),
        village_or_ward=village,
        status=complaint.status,
        status_label=STATUS_LABELS.get(complaint.status, complaint.status),
        public_status_message=complaint.public_status_message,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        events=public_events
    )

@router.get("/public/complaints/{public_reference}", response_model=PublicComplaintResponse)
def get_public_complaint(
    public_reference: str,
    db: Session = Depends(get_db)
):
    return track_public_complaint(PublicComplaintTrackRequest(public_reference=public_reference), db)

@router.post("/public/complaints/{public_reference}/follow-up")
def add_public_follow_up(
    public_reference: str,
    payload: ComplaintFollowUpRequest,
    db: Session = Depends(get_db)
):
    ref = public_reference.strip().upper()
    complaint = db.query(Complaint).filter(Complaint.public_reference == ref).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    add_complaint_event(
        db=db,
        complaint_id=complaint.id,
        event_type="citizen_followup",
        actor_name="Citizen Resident",
        public_message=f"Resident Follow-up: {payload.message}",
    )
    complaint.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Follow-up added to complaint timeline."}

@router.post("/public/complaints/upload-photo")
async def upload_complaint_photo(
    file: UploadFile = File(...)
):
    # Validate extension and size
    allowed_exts = [".jpg", ".jpeg", ".png", ".webp"]
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in allowed_exts:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image size exceeds maximum limit of {settings.MAX_UPLOAD_MB}MB.")

    filename = f"complaint_{uuid.uuid4().hex[:12]}{ext.lower()}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(file_bytes)

    return {
        "filename": filename,
        "photo_url": f"/uploads/{filename}",
        "size_kb": round(len(file_bytes) / 1024, 1)
    }

# ----------------- OFFICIAL GP ROUTES -----------------

@router.get("/complaints", response_model=List[OfficialComplaintListItem])
def list_official_complaints(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    query = db.query(Complaint).filter(Complaint.gram_panchayat_id == gp_id)

    if status:
        query = query.filter(Complaint.status == status.lower())
    if category:
        query = query.filter(Complaint.category == category.lower())
    if assigned_to:
        query = query.filter(Complaint.assigned_to == assigned_to)
    if village:
        query = query.join(Connection, Connection.id == Complaint.connection_id).filter(
            Connection.village_or_ward.ilike(f"%{village}%")
        )

    complaints = query.order_by(desc(Complaint.created_at)).limit(limit).all()

    items = []
    for c in complaints:
        fhtc = c.connection.fhtc_id if c.connection else None
        v_ward = c.connection.village_or_ward if c.connection else None
        items.append(OfficialComplaintListItem(
            id=c.id,
            public_reference=c.public_reference,
            connection_id=c.connection_id,
            fhtc_id=fhtc,
            village_or_ward=v_ward,
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
    return items

@router.get("/complaints/{complaint_id}", response_model=OfficialComplaintDetail)
def get_official_complaint_detail(
    complaint_id: str,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    c = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.gram_panchayat_id == gp_id
    ).first()

    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    conn = c.connection
    events_data = []
    for ev in c.events:
        events_data.append({
            "id": ev.id,
            "event_type": ev.event_type,
            "actor_name": ev.actor_name,
            "old_status": ev.old_status,
            "new_status": ev.new_status,
            "public_message": ev.public_message,
            "internal_note": ev.internal_note,
            "created_at": ev.created_at.isoformat()
        })

    return OfficialComplaintDetail(
        id=c.id,
        public_reference=c.public_reference,
        connection_id=c.connection_id,
        fhtc_id=conn.fhtc_id if conn else None,
        village_or_ward=conn.village_or_ward if conn else None,
        household_reference=conn.household_reference if conn else None,
        category=c.category,
        category_label=CATEGORY_LABELS.get(c.category, c.category),
        description=c.description,
        started_at_approx=c.started_at_approx,
        private_contact_phone=c.private_contact_phone,
        private_contact_name=c.private_contact_name,
        photo_url=c.photo_url,
        status=c.status,
        assigned_to=c.assigned_to,
        assignee_name=c.assignee.name if c.assignee else None,
        public_status_message=c.public_status_message,
        internal_notes=c.internal_notes,
        created_at=c.created_at,
        updated_at=c.updated_at,
        resolved_at=c.resolved_at,
        events=events_data
    )

@router.post("/complaints/{complaint_id}/assign")
def assign_complaint(
    complaint_id: str,
    payload: ComplaintAssignRequest,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    c = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.gram_panchayat_id == gp_id
    ).first()

    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    tech = db.query(User).filter(User.id == payload.assigned_to).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician user not found.")

    old_status = c.status
    c.assigned_to = tech.id
    c.status = ComplaintStatus.ASSIGNED
    c.public_status_message = f"Assigned to field technician ({tech.name}) for inspection."
    c.updated_at = datetime.now(timezone.utc)

    add_complaint_event(
        db=db,
        complaint_id=c.id,
        actor_user=current_user,
        event_type="assignment",
        old_status=old_status,
        new_status=c.status,
        public_message=c.public_status_message,
        internal_note=payload.internal_note or f"Assigned to {tech.name}"
    )

    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        gram_panchayat_id=gp_id,
        action="ASSIGN_COMPLAINT",
        entity_type="complaint",
        entity_id=c.id,
        metadata_json=json.dumps({"assigned_to": tech.name, "tech_id": tech.id})
    )
    db.add(audit)
    db.commit()

    return {"message": f"Complaint successfully assigned to {tech.name}."}

@router.post("/complaints/{complaint_id}/events")
def update_complaint_status_or_add_note(
    complaint_id: str,
    payload: ComplaintStatusUpdateRequest,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    c = db.query(Complaint).filter(
        Complaint.id == complaint_id,
        Complaint.gram_panchayat_id == gp_id
    ).first()

    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    old_status = c.status
    c.status = payload.new_status
    if payload.public_message:
        c.public_status_message = payload.public_message
    if payload.internal_note:
        c.internal_notes = payload.internal_note

    if payload.new_status == ComplaintStatus.RESOLVED:
        c.resolved_at = datetime.now(timezone.utc)

    c.updated_at = datetime.now(timezone.utc)

    add_complaint_event(
        db=db,
        complaint_id=c.id,
        actor_user=current_user,
        event_type="status_change",
        old_status=old_status,
        new_status=c.status,
        public_message=payload.public_message,
        internal_note=payload.internal_note
    )

    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        gram_panchayat_id=gp_id,
        action="UPDATE_COMPLAINT_STATUS",
        entity_type="complaint",
        entity_id=c.id,
        metadata_json=json.dumps({
            "old_status": old_status,
            "new_status": payload.new_status,
            "public_message": payload.public_message
        })
    )
    db.add(audit)
    db.commit()

    return {"message": "Complaint status updated and logged to audit trail."}
