from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_healthy = False

    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database_connected": db_healthy,
        "demo_mode": settings.DEMO_MODE,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }
