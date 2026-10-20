import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.entities import Connection, Device, SensorReading, Alert, ThresholdSetting
from app.core.permissions import AlertSeverity, AlertStatus

def is_within_window(current_time: datetime, start_str: str, end_str: str) -> bool:
    try:
        sh, sm = map(int, start_str.split(":"))
        eh, em = map(int, end_str.split(":"))
        curr_min = current_time.hour * 60 + current_time.minute
        start_min = sh * 60 + sm
        end_min = eh * 60 + em
        if start_min <= end_min:
            return start_min <= curr_min <= end_min
        else:
            # Crosses midnight
            return curr_min >= start_min or curr_min <= end_min
    except Exception:
        return False

def evaluate_reading_rules(
    db: Session,
    connection: Connection,
    reading: SensorReading,
    thresholds: Optional[ThresholdSetting] = None
) -> List[Alert]:
    alerts_created: List[Alert] = []

    # Default thresholds if not configured for this GP
    min_flow = thresholds.min_flow_lpm if thresholds else 2.0
    min_pressure = thresholds.min_pressure_bar if thresholds else 0.7
    max_pressure = thresholds.max_pressure_bar if thresholds else 3.0
    m_start = thresholds.supply_window_start if thresholds else "06:00"
    m_end = thresholds.supply_window_end if thresholds else "09:00"
    e_start = thresholds.evening_window_start if thresholds else "17:30"
    e_end = thresholds.evening_window_end if thresholds else "20:00"

    observed_time = reading.observed_at
    hour_bucket = observed_time.strftime("%Y-%m-%d-%H")

    # 1. Check supply window
    in_supply_window = is_within_window(observed_time, m_start, m_end) or is_within_window(observed_time, e_start, e_end)

    # RULE 1: NO FLOW DURING SCHEDULED SUPPLY WINDOW
    if in_supply_window and reading.flow_rate is not None and reading.flow_rate < min_flow:
        dedupe_key = f"{connection.id}:NO_FLOW_SUPPLY_WINDOW:{hour_bucket}"
        existing = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()
        if not existing:
            alert = Alert(
                connection_id=connection.id,
                device_id=reading.device_id,
                gram_panchayat_id=connection.gram_panchayat_id,
                alert_type="NO_FLOW_SUPPLY_WINDOW",
                severity=AlertSeverity.CRITICAL,
                title="Zero or Low Flow During Supply Window",
                reason=f"Measured flow rate ({reading.flow_rate} L/min) is below minimum threshold ({min_flow} L/min) during scheduled supply hours.",
                evidence_json=json.dumps({
                    "measured_flow_lpm": reading.flow_rate,
                    "min_required_flow": min_flow,
                    "window": f"{m_start}-{m_end} / {e_start}-{e_end}",
                    "observed_at": reading.observed_at.isoformat()
                }),
                rule_version="v1.0.0",
                status=AlertStatus.OPEN,
                triggered_at=reading.observed_at,
                dedupe_key=dedupe_key
            )
            db.add(alert)
            alerts_created.append(alert)

    # RULE 2: LOW PRESSURE
    if in_supply_window and reading.pressure is not None and reading.pressure < min_pressure:
        dedupe_key = f"{connection.id}:LOW_PRESSURE:{hour_bucket}"
        existing = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()
        if not existing:
            alert = Alert(
                connection_id=connection.id,
                device_id=reading.device_id,
                gram_panchayat_id=connection.gram_panchayat_id,
                alert_type="LOW_PRESSURE",
                severity=AlertSeverity.ATTENTION,
                title="Low Terminal Water Pressure",
                reason=f"Water pressure ({reading.pressure} bar) dropped below minimum acceptable head ({min_pressure} bar).",
                evidence_json=json.dumps({
                    "measured_pressure_bar": reading.pressure,
                    "min_pressure_threshold": min_pressure,
                    "observed_at": reading.observed_at.isoformat()
                }),
                rule_version="v1.0.0",
                status=AlertStatus.OPEN,
                triggered_at=reading.observed_at,
                dedupe_key=dedupe_key
            )
            db.add(alert)
            alerts_created.append(alert)

    # RULE 3: ABNORMAL HIGH PRESSURE (PIPE SURGE / HAMMER HAZARD)
    if reading.pressure is not None and reading.pressure > max_pressure:
        dedupe_key = f"{connection.id}:HIGH_PRESSURE:{hour_bucket}"
        existing = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()
        if not existing:
            alert = Alert(
                connection_id=connection.id,
                device_id=reading.device_id,
                gram_panchayat_id=connection.gram_panchayat_id,
                alert_type="HIGH_PRESSURE",
                severity=AlertSeverity.ATTENTION,
                title="Excessive Pressure Spike Detected",
                reason=f"Water pressure ({reading.pressure} bar) exceeds maximum safe limit ({max_pressure} bar), risking pipeline rupture or joint blowouts.",
                evidence_json=json.dumps({
                    "measured_pressure_bar": reading.pressure,
                    "max_safe_pressure": max_pressure,
                    "observed_at": reading.observed_at.isoformat()
                }),
                rule_version="v1.0.0",
                status=AlertStatus.OPEN,
                triggered_at=reading.observed_at,
                dedupe_key=dedupe_key
            )
            db.add(alert)
            alerts_created.append(alert)

    # RULE 4: WATER QUALITY SCREENING ALERT (pH or Turbidity)
    if (reading.ph is not None and (reading.ph < 6.5 or reading.ph > 8.5)) or \
       (reading.turbidity is not None and reading.turbidity > 5.0):
        dedupe_key = f"{connection.id}:WATER_QUALITY_SCREENING:{hour_bucket}"
        existing = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()
        if not existing:
            reasons = []
            if reading.ph is not None and (reading.ph < 6.5 or reading.ph > 8.5):
                reasons.append(f"pH {reading.ph} outside acceptable BIS 10500 potable range (6.5 - 8.5)")
            if reading.turbidity is not None and reading.turbidity > 5.0:
                reasons.append(f"Turbidity {reading.turbidity} NTU exceeds screening threshold of 5 NTU")

            alert = Alert(
                connection_id=connection.id,
                device_id=reading.device_id,
                gram_panchayat_id=connection.gram_panchayat_id,
                alert_type="WATER_QUALITY_SCREENING",
                severity=AlertSeverity.ATTENTION,
                title="Water Quality Screening Indicator",
                reason="; ".join(reasons) + ". (Note: Low-cost sensor screening indicator; requires certified lab verification).",
                evidence_json=json.dumps({
                    "ph": reading.ph,
                    "turbidity_ntu": reading.turbidity,
                    "observed_at": reading.observed_at.isoformat()
                }),
                rule_version="v1.0.0",
                status=AlertStatus.OPEN,
                triggered_at=reading.observed_at,
                dedupe_key=dedupe_key
            )
            db.add(alert)
            alerts_created.append(alert)

    # RULE 5: SENSOR ANOMALY (e.g. impossible values)
    if (reading.flow_rate is not None and reading.flow_rate < 0) or (reading.pressure is not None and reading.pressure < 0):
        dedupe_key = f"{connection.id}:SENSOR_ANOMALY:{hour_bucket}"
        existing = db.query(Alert).filter(Alert.dedupe_key == dedupe_key).first()
        if not existing:
            alert = Alert(
                connection_id=connection.id,
                device_id=reading.device_id,
                gram_panchayat_id=connection.gram_panchayat_id,
                alert_type="SENSOR_ANOMALY",
                severity=AlertSeverity.INFO,
                title="Sensor Signal Validation Failure",
                reason=f"Physical telemetry value out of realistic bounds (flow={reading.flow_rate}, pressure={reading.pressure}). Possible ground fault or sensor drift.",
                evidence_json=json.dumps({
                    "flow_rate": reading.flow_rate,
                    "pressure": reading.pressure,
                    "observed_at": reading.observed_at.isoformat()
                }),
                rule_version="v1.0.0",
                status=AlertStatus.OPEN,
                triggered_at=reading.observed_at,
                dedupe_key=dedupe_key
            )
            db.add(alert)
            alerts_created.append(alert)

    return alerts_created

def compute_connection_status(
    connection: Connection,
    latest_reading: Optional[SensorReading],
    open_alerts: List[Alert],
    stale_hours: int = 6
) -> tuple[str, str]:
    """
    Returns (status, reason)
    Statuses: 'Normal', 'Attention', 'Critical', 'Unknown', 'Offline'
    """
    if not connection.device_id:
        return "Unknown", "No monitoring hardware is paired with this connection."

    if not latest_reading:
        return "Unknown", "No historical readings recorded for this connection."

    # Check freshness
    now = datetime.now(timezone.utc)
    obs_time = latest_reading.observed_at
    if obs_time.tzinfo is None:
        obs_time = obs_time.replace(tzinfo=timezone.utc)

    hours_diff = (now - obs_time).total_seconds() / 3600.0

    if hours_diff > stale_hours:
        return "Offline", f"Telemetry is stale. Last transmission received {hours_diff:.1f} hours ago."

    # Check open alerts
    critical_alerts = [a for a in open_alerts if a.severity == AlertSeverity.CRITICAL and a.status == AlertStatus.OPEN]
    if critical_alerts:
        return "Critical", f"Active critical alert: {critical_alerts[0].title}"

    attention_alerts = [a for a in open_alerts if a.severity == AlertSeverity.ATTENTION and a.status in [AlertStatus.OPEN, AlertStatus.INVESTIGATING]]
    if attention_alerts:
        return "Attention", f"Notice: {attention_alerts[0].title}"

    return "Normal", "Telemetry is fresh and operating within standard supply parameters."
