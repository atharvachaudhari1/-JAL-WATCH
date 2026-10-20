# JalWatch --- Production Deployment & Staging Guide

## 1. Production Architecture
```
                         +-----------------------------+
                         |     Cloudflare / NGINX      |
                         |   (HTTPS, WAF, Rate Limit)  |
                         +--------------+--------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
    +------------------------+                    +------------------------+
    |    Frontend (React)    |                    |    Backend (FastAPI)   |
    |    Vercel / S3+CloudF. |                    |   Gunicorn / Uvicorn   |
    +------------------------+                    +-----------+------------+
                                                              |
                                      +-----------------------+-----------------------+
                                      |                                               |
                                      v                                               v
                          +------------------------+                      +------------------------+
                          |   PostgreSQL Database  |                      |    S3 Object Storage   |
                          |      (AWS RDS / GCP)   |                      |  (Private Attachments) |
                          +------------------------+                      +------------------------+
```

## 2. Environment Configuration
Set the following environment variables on the production server:
```bash
APP_ENV=production
APP_NAME="JalWatch API"
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+psycopg2://jalwatch_user:SecurePassword@db-host.internal:5432/jalwatch_prod
SECRET_KEY=generate-a-64-char-cryptographically-secure-random-key
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_ORIGIN=https://jalwatch.gov.in
DEMO_MODE=false
DEVICE_INGESTION_ENABLED=true
IMIS_INTEGRATION_ENABLED=false
UPLOAD_DIR=/var/data/jalwatch/uploads
MAX_UPLOAD_MB=5
```

## 3. Database Migration
When switching from SQLite (dev) to PostgreSQL:
```bash
pip install psycopg2-binary
# Ensure DATABASE_URL points to PostgreSQL instance
python -c "from app.db.session import Base, engine; Base.metadata.create_all(bind=engine)"
```

## 4. Production Process Management (Systemd / Docker)
Run FastAPI with Uvicorn workers behind Gunicorn:
```bash
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```
