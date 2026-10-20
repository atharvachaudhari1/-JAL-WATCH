# JalWatch --- REST API Reference

Base Prefix: `/api/v1`

## 1. System & Authentication
- `GET /health` --- Returns service health, environment, DB connectivity, and demo mode flag.
- `POST /auth/login` --- Official sign-in with email and password. Returns JWT bearer token and user profile.
- `POST /auth/logout` --- Invalidate official session/token.
- `GET /auth/me` --- Returns authenticated official profile and Gram Panchayat scoping.

## 2. Gram Panchayat Dashboard
- `GET /dashboard/summary` --- KPI cards (total FHTCs, active devices, recent data count, open alerts, open complaints, resolved period, data freshness).
- `GET /dashboard/activity` --- Activity timeline (complaint status transitions, alert triggers, assignments).

## 3. Connections (FHTCs)
- `GET /connections` --- List connections with filters (`status`, `village`, `has_device`, `search`, `limit`).
- `GET /connections/{connection_id}` --- Connection detail with latest telemetry, open alerts, recent complaints, and 48-hour time series.
- `GET /connections/{connection_id}/readings?hours=24` --- Time series readings for flow/pressure graphing.

## 4. Alerts
- `GET /alerts` --- Triage alert list (`status`, `severity`, `village`).
- `GET /alerts/{alert_id}` --- Alert details and evidence JSON.
- `POST /alerts/{alert_id}/acknowledge` --- Acknowledge alert.
- `POST /alerts/{alert_id}/assign` --- Assign alert investigation to field technician.
- `POST /alerts/{alert_id}/resolve` --- Mark alert resolved with audit reason.

## 5. Complaints
### Citizen Public Endpoints
- `POST /public/complaints` --- Citizen grievance submission. Generates public reference (e.g. `JW-2026-000101`).
- `POST /public/complaints/track` --- Track complaint status and public update timeline.
- `GET /public/complaints/{public_reference}` --- Tracking view.
- `POST /public/complaints/{public_reference}/follow-up` --- Citizen follow-up notes.
- `POST /public/complaints/upload-photo` --- Photo attachment upload.

### Official Endpoints
- `GET /complaints` --- List complaints with filters (`status`, `category`, `village`, `assigned_to`).
- `GET /complaints/{complaint_id}` --- Detail view with internal notes and private contact details.
- `POST /complaints/{complaint_id}/assign` --- Assign complaint to technician.
- `POST /complaints/{complaint_id}/events` --- Update status, post public message, add internal note.

## 6. IoT Telemetry Ingestion
- `POST /ingest/readings` --- Ingest sensor batch with `X-Device-Key` authentication.
- `POST /devices/{device_id}/heartbeat` --- Device ping and battery update.
- `GET /devices` --- List registered IoT devices.

## 7. Reports & Settings
- `GET /reports/alerts.csv` --- Stream CSV report of alerts.
- `GET /reports/complaints.csv` --- Stream CSV report of complaints.
- `GET /reports/metrics` --- Aggregate metrics summary.
- `GET /settings/thresholds` --- Current alert thresholds and supply window hours.
- `PUT /settings/thresholds` --- Update thresholds with audit logging.
- `GET /settings/staff` --- Staff accounts for task assignment.

## 8. Government Integrations
- `GET /integrations/status` --- Reports IMIS / Sujal Gaon connection status.
- `POST /integrations/imis/sync` --- Attempt sync (returns unconfigured advisory if credentials not provided).
- `GET /integrations/sync-logs` --- Audit log of sync attempts.
