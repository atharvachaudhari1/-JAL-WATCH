import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.seed.seed_data import seed_database

# Routers
from app.api.routes import health
from app.api.routes import auth
from app.api.routes import dashboard
from app.api.routes import connections
from app.api.routes import alerts
from app.api.routes import complaints
from app.api.routes import ingest
from app.api.routes import reports
from app.api.routes import settings as settings_routes
from app.api.routes import integrations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default demo data if enabled
    Base.metadata.create_all(bind=engine)
    if settings.DEMO_MODE:
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    yield
    # Shutdown logic if any

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="JalWatch API - Real-Time Telemetry & Citizen Grievance Redressal for Functional Household Tap Connections (SIH 2026 PS 26255)",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory for complaint attachments
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers under /api/v1
api_prefix = settings.API_V1_PREFIX
app.include_router(health.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(connections.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(complaints.router, prefix=api_prefix)
app.include_router(ingest.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(settings_routes.router, prefix=api_prefix)
app.include_router(integrations.router, prefix=api_prefix)

@app.get("/")
def root_redirect():
    return {
        "project": "JalWatch",
        "description": "Ministry of Jal Shakti / National Jal Jeevan Mission - Real-Time FHTC Monitoring",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
        "demo_mode": settings.DEMO_MODE
    }
