import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_official, get_authenticated_device
from app.models.entities import (
    Device, Connection, SensorReading, Alert, ThresholdSetting, User
)
from app.schemas.schemas import (
    ReadingIngestPayload, BatchReadingIngestPayload, ReadingIngestResponse
)
from app.services.alert_rules import evaluate_reading_rules, is_within_window
from app.services.ml_anomaly import ml_detector
from app.core.permissions import AlertSeverity, AlertStatus
from app.core.config import settings

router = APIRouter(tags=["IoT Device Ingestion & Telemetry"])

# ── Hardware Device Payload Schema (matches your ESP32 JSON exactly) ─────────
from pydantic import BaseModel as _BaseModel

class HardwarePayload(_BaseModel):
    household_id: str               # e.g. "HH001"
    flow_rate: float                # L/min
    status: str                     # "FUNCTIONAL" | "NO_FLOW" | "FAULT"
    adc: Optional[int] = None       # Raw ADC value (0-4095)
    supply_expected: bool = True    # Whether supply window is active
    pressure: Optional[float] = None
    battery_level: Optional[float] = None
    sequence_number: Optional[int] = None

@router.post("/ingest/readings", response_model=ReadingIngestResponse)
def ingest_readings(
    payload: BatchReadingIngestPayload,
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    if not settings.DEVICE_INGESTION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Hardware device ingestion is currently disabled by administrator configuration."
        )

    # 1. Device Authentication
    device = db.query(Device).filter(Device.device_code == payload.device_code).first()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device code '{payload.device_code}' not registered.")

    # In production, check API key:
    if x_device_key and device.api_key and x_device_key != device.api_key:
        raise HTTPException(status_code=401, detail="Invalid X-Device-Key provided.")

    if not device.connection:
        raise HTTPException(
            status_code=400,
            detail=f"Device '{payload.device_code}' is registered but not linked to any active FHTC connection."
        )

    connection = device.connection
    gp_id = connection.gram_panchayat_id

    # Get local thresholds
    thresholds = db.query(ThresholdSetting).filter(ThresholdSetting.gram_panchayat_id == gp_id).first()

    now = datetime.now(timezone.utc)
    accepted_count = 0
    alerts_triggered_count = 0

    for item in payload.readings:
        obs_time = item.observed_at
        if obs_time.tzinfo is None:
            obs_time = obs_time.replace(tzinfo=timezone.utc)

        # Sanity check: Reject future readings (> 5 minutes in future)
        if obs_time > now + timedelta(minutes=5):
            continue

        # Sanity check: Reject ancient readings (> 30 days)
        if obs_time < now - timedelta(days=30):
            continue

        flags = []
        if item.flow_rate is not None and item.flow_rate < 0.0:
            flags.append("NEGATIVE_FLOW")
        if item.pressure is not None and item.pressure < 0.0:
            flags.append("NEGATIVE_PRESSURE")
        if not flags:
            flags.append("VALIDATED")

        # Create reading record
        reading = SensorReading(
            device_id=device.id,
            connection_id=connection.id,
            observed_at=obs_time,
            received_at=now,
            flow_rate=item.flow_rate,
            volume=item.volume,
            pressure=item.pressure,
            turbidity=item.turbidity,
            ph=item.ph,
            source=item.source or "device",
            sequence_number=item.sequence_number,
            quality_flags_json=json.dumps(flags)
        )
        db.add(reading)
        accepted_count += 1

        # Evaluate deterministic rule engine
        triggered_alerts = evaluate_reading_rules(
            db=db,
            connection=connection,
            reading=reading,
            thresholds=thresholds
        )
        alerts_triggered_count += len(triggered_alerts)

        # Evaluate ML Anomaly Detector (Phase 3 AI/ML baseline)
        m_start = thresholds.supply_window_start if thresholds else "06:00"
        m_end = thresholds.supply_window_end if thresholds else "09:00"
        e_start = thresholds.evening_window_start if thresholds else "17:30"
        e_end = thresholds.evening_window_end if thresholds else "20:00"
        in_supply = is_within_window(obs_time, m_start, m_end) or is_within_window(obs_time, e_start, e_end)

        ml_result = ml_detector.evaluate_reading(
            flow_rate=item.flow_rate,
            pressure=item.pressure,
            observed_at=obs_time,
            in_supply_window=in_supply
        )

        if ml_result["is_anomaly"] and not triggered_alerts:
            # ML identified an explainable statistical anomaly not caught by fixed thresholds!
            hour_bucket = obs_time.strftime("%Y-%m-%d-%H")
            dedupe_key = f"{connection.id}:ML_ANOMALY:{hour_bucket}"
            existing = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()
            if not existing:
                ml_alert = Alert(
                    connection_id=connection.id,
                    device_id=device.id,
                    gram_panchayat_id=gp_id,
                    alert_type="ML_ANOMALY_STATISTICAL",
                    severity=AlertSeverity.INFO,
                    title="Statistical Flow/Pressure Deviation (AI/ML Screening)",
                    reason=ml_result["explanation"],
                    evidence_json=json.dumps({
                        "anomaly_score": ml_result["anomaly_score"],
                        "model_version": ml_result["model_version"],
                        "flow_rate": item.flow_rate,
                        "pressure": item.pressure
                    }),
                    rule_version="ml-screening-v1",
                    model_version=ml_result["model_version"],
                    status=AlertStatus.OPEN,
                    triggered_at=obs_time,
                    dedupe_key=dedupe_key
                )
                db.add(ml_alert)
                alerts_triggered_count += 1

    # Update device heartbeat & health status
    device.last_seen_at = now
    if payload.readings and payload.readings[-1].battery_level is not None:
        device.battery_level = payload.readings[-1].battery_level
    device.health_status = "HEALTHY"

    db.commit()

    return ReadingIngestResponse(
        status="success",
        accepted_count=accepted_count,
        alerts_triggered=alerts_triggered_count,
        message=f"Ingested {accepted_count} telemetry records from device {payload.device_code}."
    )


# ── Hardware Simple Ingest (matches your ESP32 JSON payload exactly) ──────────
@router.post("/ingest/hardware", summary="Hardware Device Simple Ingest (HH001 format)")
def ingest_hardware(
    payload: HardwarePayload,
    x_device_key: Optional[str] = Header(None, alias="X-Device-Key"),
    db: Session = Depends(get_db)
):
    """
    Accepts the exact JSON your hardware device sends:
      {"household_id":"HH001","flow_rate":6.00,"status":"FUNCTIONAL","adc":4095,"supply_expected":true}

    Maps household_id → FHTC connection → stores reading + runs alert rules.
    Returns the current connection status back to the device.
    """
    if not settings.DEVICE_INGESTION_ENABLED:
        raise HTTPException(status_code=503, detail="Device ingestion disabled.")

    # Map household_id to connection (household_reference contains HH001 etc.)
    connection = db.query(Connection).filter(
        Connection.household_reference.contains(payload.household_id)
    ).first()

    # Fallback: try fhtc_id suffix match (e.g. HH001 → MH-PUN-SHIR-001)
    if not connection:
        suffix = payload.household_id.replace("HH", "").lstrip("0")
        fhtc_candidate = f"MH-PUN-SHIR-{int(suffix):03d}" if suffix.isdigit() else None
        if fhtc_candidate:
            connection = db.query(Connection).filter(
                Connection.fhtc_id == fhtc_candidate
            ).first()

    if not connection:
        raise HTTPException(
            status_code=404,
            detail=f"No FHTC connection found for household_id '{payload.household_id}'. "
                   f"Please register this household first."
        )

    if not connection.device_id:
        raise HTTPException(
            status_code=400,
            detail=f"Connection {connection.fhtc_id} has no paired IoT device."
        )

    device = connection.device

    # Validate API key if provided
    if x_device_key and device.api_key and x_device_key != device.api_key:
        raise HTTPException(status_code=401, detail="Invalid X-Device-Key.")

    now = datetime.now(timezone.utc)
    gp_id = connection.gram_panchayat_id
    thresholds = db.query(ThresholdSetting).filter(
        ThresholdSetting.gram_panchayat_id == gp_id
    ).first()

    # Convert ADC → pressure estimate (0-4095 ADC → 0-5 bar linear mapping)
    pressure = payload.pressure
    if pressure is None and payload.adc is not None:
        pressure = round((payload.adc / 4095.0) * 5.0, 2)

    # Map status string → quality flags
    flags = []
    if payload.status == "FUNCTIONAL":
        flags = ["VALIDATED", "FUNCTIONAL"]
    elif payload.status == "NO_FLOW":
        flags = ["ZERO_FLOW"]
        if payload.supply_expected:
            flags.append("SUPPLY_ACTIVE")
    elif payload.status == "FAULT":
        flags = ["SENSOR_FAULT"]
    else:
        flags = ["VALIDATED"]

    reading = SensorReading(
        device_id=device.id,
        connection_id=connection.id,
        observed_at=now,
        received_at=now,
        flow_rate=payload.flow_rate,
        pressure=pressure,
        source="device",
        sequence_number=payload.sequence_number,
        quality_flags_json=json.dumps(flags)
    )
    db.add(reading)

    # Run alert rules
    triggered_alerts = evaluate_reading_rules(
        db=db,
        connection=connection,
        reading=reading,
        thresholds=thresholds
    )

    # Update device heartbeat
    device.last_seen_at = now
    device.health_status = "HEALTHY"
    if payload.battery_level is not None:
        device.battery_level = payload.battery_level

    db.commit()

    # Compute derived status for response
    computed_status = "FUNCTIONAL"
    if payload.status == "NO_FLOW" and payload.supply_expected:
        computed_status = "CRITICAL"
    elif payload.status == "NO_FLOW":
        computed_status = "NORMAL"
    elif payload.status == "FAULT":
        computed_status = "FAULT"

    return {
        "status": "accepted",
        "household_id": payload.household_id,
        "fhtc_id": connection.fhtc_id,
        "flow_rate": payload.flow_rate,
        "pressure_bar": pressure,
        "adc_raw": payload.adc,
        "device_status": payload.status,
        "computed_status": computed_status,
        "supply_expected": payload.supply_expected,
        "alerts_triggered": len(triggered_alerts),
        "quality_flags": flags,
        "timestamp": now.isoformat(),
        "message": f"Reading accepted for {connection.fhtc_id} ({payload.household_id})"
    }

@router.post("/devices/{device_id}/heartbeat")
def device_heartbeat(
    device_id: str,
    battery_level: Optional[float] = None,
    db: Session = Depends(get_db)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    device.last_seen_at = datetime.now(timezone.utc)
    if battery_level is not None:
        device.battery_level = battery_level
    device.health_status = "HEALTHY"
    db.commit()
    return {"status": "heartbeat_acknowledged", "last_seen_at": device.last_seen_at.isoformat()}

@router.get("/devices")
def list_devices(
    current_user: User = Depends(get_current_official),
    db: Session = Depends(get_db)
):
    gp_id = current_user.gram_panchayat_id or "gp-shirsuphal-pune"
    devices = db.query(Device).join(
        Connection, Connection.device_id == Device.id
    ).filter(
        Connection.gram_panchayat_id == gp_id
    ).all()

    items = []
    for d in devices:
        items.append({
            "id": d.id,
            "device_code": d.device_code,
            "fhtc_id": d.connection.fhtc_id if d.connection else None,
            "village_or_ward": d.connection.village_or_ward if d.connection else None,
            "device_type": d.device_type,
            "firmware_version": d.firmware_version,
            "last_seen_at": d.last_seen_at,
            "health_status": d.health_status,
            "battery_level": d.battery_level,
            "registered_at": d.registered_at
        })
    return items
