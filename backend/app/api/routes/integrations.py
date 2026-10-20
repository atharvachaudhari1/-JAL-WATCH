from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.api.deps import get_current_official
from app.models.entities import User, IntegrationSyncLog
from app.schemas.schemas import IntegrationStatusResponse
from app.services.integrations import imis_adapter

router = APIRouter(prefix="/integrations", tags=["Government Integrations (IMIS / Sujal Gaon)"])

@router.get("/status", response_model=IntegrationStatusResponse)
def get_integration_status(
    current_user: User = Depends(get_current_official)
):
    status_data = imis_adapter.get_status()
    return IntegrationStatusResponse(**status_data)

@router.post("/imis/sync")
def trigger_imis_sync(
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    result = imis_adapter.trigger_sync(db, current_user.email)
    return result

@router.get("/sync-logs")
def get_sync_logs(
    limit: int = 20,
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    logs = db.query(IntegrationSyncLog).order_by(desc(IntegrationSyncLog.last_attempt_at)).limit(limit).all()
    return [
        {
            "id": l.id,
            "system_name": l.system_name,
            "record_type": l.record_type,
            "status": l.status,
            "attempt_count": l.attempt_count,
            "last_error": l.last_error,
            "last_attempt_at": l.last_attempt_at,
            "synced_at": l.synced_at
        }
        for l in logs
    ]
