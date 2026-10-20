import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    Text,
    Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class GramPanchayat(Base):
    __tablename__ = "gram_panchayats"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, index=True)
    district = Column(String, nullable=False, index=True)
    state = Column(String, nullable=False, default="Maharashtra")
    official_external_id = Column(String, nullable=True) # e.g. LGD code
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    users = relationship("User", back_populates="gram_panchayat", cascade="all, delete-orphan")
    connections = relationship("Connection", back_populates="gram_panchayat", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="gram_panchayat", cascade="all, delete-orphan")
    threshold_setting = relationship("ThresholdSetting", back_populates="gram_panchayat", uselist=False, cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="gp_official") # "admin", "gp_official", "field_worker"
    gram_panchayat_id = Column(String, ForeignKey("gram_panchayats.id"), nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    gram_panchayat = relationship("GramPanchayat", back_populates="users")
    assigned_complaints = relationship("Complaint", foreign_keys="Complaint.assigned_to", back_populates="assignee")
    assigned_alerts = relationship("Alert", foreign_keys="Alert.assigned_to", back_populates="assignee")

class Connection(Base):
    __tablename__ = "connections"

    id = Column(String, primary_key=True, default=generate_uuid)
    fhtc_id = Column(String, unique=True, index=True, nullable=False) # e.g. "MH-PUN-SHIR-001"
    gram_panchayat_id = Column(String, ForeignKey("gram_panchayats.id"), nullable=False, index=True)
    village_or_ward = Column(String, nullable=False, index=True)
    household_reference = Column(String, nullable=False) # Minimised e.g. "HH-104 (Patil)"
    device_id = Column(String, ForeignKey("devices.id"), nullable=True)
    supply_schedule_json = Column(Text, nullable=True) # e.g. '{"morning_start":"06:00","morning_end":"09:00","evening_start":"17:30","evening_end":"20:00"}'
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    gram_panchayat = relationship("GramPanchayat", back_populates="connections")
    device = relationship("Device", back_populates="connection", uselist=False, foreign_keys=[device_id])
    readings = relationship("SensorReading", back_populates="connection", cascade="all, delete-orphan", order_by="desc(SensorReading.observed_at)")
    alerts = relationship("Alert", back_populates="connection", cascade="all, delete-orphan", order_by="desc(Alert.triggered_at)")
    complaints = relationship("Complaint", back_populates="connection")

class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=generate_uuid)
    device_code = Column(String, unique=True, index=True, nullable=False) # e.g. "JW-ESP32-001"
    device_type = Column(String, default="ESP32-CELLULAR")
    firmware_version = Column(String, default="1.2.0")
    api_key = Column(String, nullable=False, default=generate_uuid) # Token for device ingestion
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    health_status = Column(String, default="HEALTHY") # "HEALTHY", "DEGRADED", "OFFLINE"
    battery_level = Column(Float, nullable=True) # Percentage (e.g. 94.5)
    registered_at = Column(DateTime(timezone=True), default=get_utc_now)

    connection = relationship("Connection", back_populates="device", foreign_keys="Connection.device_id", uselist=False)
    readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")
    calibrations = relationship("DeviceCalibration", back_populates="device", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(String, primary_key=True, default=generate_uuid)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False, index=True)
    connection_id = Column(String, ForeignKey("connections.id"), nullable=False, index=True)
    observed_at = Column(DateTime(timezone=True), nullable=False, index=True)
    received_at = Column(DateTime(timezone=True), default=get_utc_now)
    flow_rate = Column(Float, nullable=True) # L/min
    volume = Column(Float, nullable=True) # Cumulative Litres
    pressure = Column(Float, nullable=True) # Bar
    turbidity = Column(Float, nullable=True) # NTU
    ph = Column(Float, nullable=True)
    source = Column(String, default="demo") # "device", "demo", "manual_import"
    sequence_number = Column(Integer, nullable=True)
    quality_flags_json = Column(Text, default="[]") # e.g. '["OK"]' or '["ZERO_FLOW","SUPPLY_ACTIVE"]'

    device = relationship("Device", back_populates="readings")
    connection = relationship("Connection", back_populates="readings")

    __table_args__ = (
        Index("idx_reading_conn_time", "connection_id", "observed_at"),
    )

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    connection_id = Column(String, ForeignKey("connections.id"), nullable=False, index=True)
    device_id = Column(String, ForeignKey("devices.id"), nullable=True)
    gram_panchayat_id = Column(String, ForeignKey("gram_panchayats.id"), nullable=False, index=True)
    alert_type = Column(String, nullable=False, index=True) # "NO_FLOW_SUPPLY_WINDOW", "LOW_PRESSURE", "HIGH_PRESSURE", "STALE_DATA", "POSSIBLE_LEAK", "WATER_QUALITY_SCREENING", "SENSOR_ANOMALY"
    severity = Column(String, nullable=False, index=True) # "CRITICAL", "ATTENTION", "INFO"
    title = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    evidence_json = Column(Text, default="{}") # e.g. '{"flow": 0.0, "threshold": 2.0, "window": "06:00-09:00"}'
    rule_version = Column(String, default="v1.0.0")
    model_version = Column(String, nullable=True) # if ML triggered
    status = Column(String, default="open", index=True) # "open", "acknowledged", "investigating", "resolved", "false_alarm"
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    triggered_at = Column(DateTime(timezone=True), default=get_utc_now, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_note = Column(Text, nullable=True)
    dedupe_key = Column(String, index=True, nullable=False) # connection_id + alert_type + hour

    connection = relationship("Connection", back_populates="alerts")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_alerts")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=generate_uuid)
    public_reference = Column(String, unique=True, index=True, nullable=False) # e.g. "JW-2026-000101"
    connection_id = Column(String, ForeignKey("connections.id"), nullable=True, index=True)
    gram_panchayat_id = Column(String, ForeignKey("gram_panchayats.id"), nullable=False, index=True)
    category = Column(String, nullable=False, index=True) # "no_water", "low_pressure", "intermittent", "quality", "leakage", "damaged_pipe", "other"
    description = Column(Text, nullable=False)
    started_at_approx = Column(String, nullable=True)
    private_contact_phone = Column(String, nullable=True)
    private_contact_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    status = Column(String, default="submitted", index=True) # "submitted", "acknowledged", "assigned", "in_progress", "resolved", "duplicate", "rejected"
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    public_status_message = Column(Text, default="Your complaint has been registered and is pending initial review.")
    internal_notes = Column(Text, nullable=True) # Only visible to GP staff
    created_at = Column(DateTime(timezone=True), default=get_utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    gram_panchayat = relationship("GramPanchayat", back_populates="complaints")
    connection = relationship("Connection", back_populates="complaints")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_complaints")
    events = relationship("ComplaintEvent", back_populates="complaint", cascade="all, delete-orphan", order_by="desc(ComplaintEvent.created_at)")

class ComplaintEvent(Base):
    __tablename__ = "complaint_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=False, index=True)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String, default="System")
    event_type = Column(String, nullable=False) # "status_change", "assignment", "internal_note", "public_update", "citizen_followup"
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    public_message = Column(Text, nullable=True)
    internal_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    complaint = relationship("Complaint", back_populates="events")

class ThresholdSetting(Base):
    __tablename__ = "threshold_settings"

    id = Column(String, primary_key=True, default=generate_uuid)
    gram_panchayat_id = Column(String, ForeignKey("gram_panchayats.id"), unique=True, nullable=False)
    min_flow_lpm = Column(Float, default=2.0)
    min_pressure_bar = Column(Float, default=0.7)
    max_pressure_bar = Column(Float, default=3.0)
    stale_data_hours = Column(Integer, default=6)
    supply_window_start = Column(String, default="06:00")
    supply_window_end = Column(String, default="09:00")
    evening_window_start = Column(String, default="17:30")
    evening_window_end = Column(String, default="20:00")
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)
    updated_by = Column(String, nullable=True)

    gram_panchayat = relationship("GramPanchayat", back_populates="threshold_setting")

class DeviceCalibration(Base):
    __tablename__ = "device_calibrations"

    id = Column(String, primary_key=True, default=generate_uuid)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False, index=True)
    calibrated_at = Column(DateTime(timezone=True), default=get_utc_now)
    performed_by = Column(String, nullable=False)
    reference_method = Column(String, nullable=False) # e.g. "Gravimetric 10L Bucket Test"
    result = Column(String, nullable=False) # e.g. "K-factor adjusted from 450 to 462 pulses/L"
    next_due_at = Column(DateTime(timezone=True), nullable=True)

    device = relationship("Device", back_populates="calibrations")

class IntegrationSyncLog(Base):
    __tablename__ = "integration_sync_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    system_name = Column(String, default="IMIS") # "IMIS", "SUJAL_GAON"
    record_type = Column(String, nullable=False) # "fhtc_status", "monthly_report"
    local_record_id = Column(String, nullable=False)
    external_record_id = Column(String, nullable=True)
    direction = Column(String, default="outbound")
    status = Column(String, default="DISABLED") # "DISABLED", "PENDING", "FAILED", "SYNCED"
    attempt_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    last_attempt_at = Column(DateTime(timezone=True), default=get_utc_now)
    synced_at = Column(DateTime(timezone=True), nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_user_id = Column(String, nullable=True, index=True)
    actor_email = Column(String, nullable=True)
    gram_panchayat_id = Column(String, nullable=True, index=True)
    action = Column(String, nullable=False) # e.g. "UPDATE_THRESHOLD", "ASSIGN_COMPLAINT"
    entity_type = Column(String, nullable=False) # "complaint", "alert", "threshold"
    entity_id = Column(String, nullable=False)
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime(timezone=True), default=get_utc_now, index=True)
