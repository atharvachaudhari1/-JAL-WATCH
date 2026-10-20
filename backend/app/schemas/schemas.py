from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ----------------- Auth Schemas -----------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    gram_panchayat_id: Optional[str] = None
    gram_panchayat_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

# ----------------- Dashboard Schemas -----------------
class DashboardSummaryResponse(BaseModel):
    gram_panchayat_id: str
    gram_panchayat_name: str
    district: str
    state: str
    total_connections: int
    active_devices: int
    connections_with_recent_data: int
    active_alerts: int
    critical_alerts: int
    open_complaints: int
    resolved_complaints_period: int
    data_freshness_status: str # "FRESH", "SOME_STALE", "OFFLINE"
    last_sync_time: Optional[datetime] = None
    is_demo_data: bool = True

class ActivityItem(BaseModel):
    id: str
    type: str # "complaint_status", "alert_triggered", "assignment", "resolution"
    title: str
    description: str
    timestamp: datetime
    actor: Optional[str] = None

# ----------------- Reading & Ingest Schemas -----------------
class ReadingIngestPayload(BaseModel):
    device_code: str
    observed_at: datetime
    sequence_number: Optional[int] = None
    flow_rate: Optional[float] = Field(None, ge=0.0, le=50.0, description="Flow rate in L/min")
    flow_unit: str = "L/min"
    volume: Optional[float] = Field(None, ge=0.0, description="Cumulative volume in Litres")
    pressure: Optional[float] = Field(None, ge=0.0, le=10.0, description="Pressure in Bar")
    pressure_unit: str = "bar"
    turbidity: Optional[float] = Field(None, ge=0.0, le=100.0, description="Turbidity in NTU")
    ph: Optional[float] = Field(None, ge=0.0, le=14.0, description="pH value")
    battery_level: Optional[float] = None
    source: str = "device" # "device" or "demo"

class BatchReadingIngestPayload(BaseModel):
    device_code: str
    readings: List[ReadingIngestPayload]

class ReadingIngestResponse(BaseModel):
    status: str
    accepted_count: int
    alerts_triggered: int
    message: str

class ReadingPoint(BaseModel):
    observed_at: datetime
    flow_rate: Optional[float] = None
    pressure: Optional[float] = None
    volume: Optional[float] = None
    turbidity: Optional[float] = None
    ph: Optional[float] = None
    source: str
    quality_flags: List[str] = []

    model_config = ConfigDict(from_attributes=True)

# ----------------- Connection Schemas -----------------
class ConnectionListItem(BaseModel):
    id: str
    fhtc_id: str
    village_or_ward: str
    household_reference: str
    device_id: Optional[str] = None
    device_code: Optional[str] = None
    latest_flow: Optional[float] = None
    latest_pressure: Optional[float] = None
    last_reading_time: Optional[datetime] = None
    computed_status: str # "Normal", "Attention", "Critical", "Unknown", "Offline"
    status_reason: str
    open_alerts_count: int = 0
    has_active_complaint: bool = False

    model_config = ConfigDict(from_attributes=True)

class ConnectionDetailResponse(BaseModel):
    id: str
    fhtc_id: str
    gram_panchayat_id: str
    gram_panchayat_name: str
    village_or_ward: str
    household_reference: str
    device_id: Optional[str] = None
    device_code: Optional[str] = None
    device_type: Optional[str] = None
    firmware_version: Optional[str] = None
    device_health: Optional[str] = None
    battery_level: Optional[float] = None
    supply_schedule: Optional[Dict[str, Any]] = None
    latest_flow: Optional[float] = None
    latest_pressure: Optional[float] = None
    latest_turbidity: Optional[float] = None
    latest_ph: Optional[float] = None
    last_reading_time: Optional[datetime] = None
    computed_status: str
    status_reason: str
    data_freshness_minutes: Optional[int] = None
    open_alerts: List["AlertResponse"] = []
    recent_complaints: List["OfficialComplaintListItem"] = []
    recent_readings: List[ReadingPoint] = []

    model_config = ConfigDict(from_attributes=True)

# ----------------- Alert Schemas -----------------
class AlertResponse(BaseModel):
    id: str
    connection_id: str
    fhtc_id: Optional[str] = None
    village_or_ward: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    reason: str
    evidence: Dict[str, Any] = {}
    rule_version: str
    model_version: Optional[str] = None
    status: str
    assigned_to: Optional[str] = None
    assignee_name: Optional[str] = None
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AlertAcknowledgeRequest(BaseModel):
    note: Optional[str] = None

class AlertAssignRequest(BaseModel):
    assigned_to: str # user_id

class AlertResolveRequest(BaseModel):
    resolution_note: str

# ----------------- Complaint Schemas -----------------
class PublicComplaintCreate(BaseModel):
    connection_id_or_fhtc: Optional[str] = None
    gram_panchayat_id: Optional[str] = None
    category: str
    description: str = Field(..., min_length=5, max_length=1000)
    started_at_approx: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    consent_given: bool = True

class PublicComplaintTrackRequest(BaseModel):
    public_reference: str
    contact_phone: Optional[str] = None

class ComplaintEventItem(BaseModel):
    id: str
    event_type: str
    actor_name: str
    public_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PublicComplaintResponse(BaseModel):
    public_reference: str
    category: str
    category_label: str
    village_or_ward: Optional[str] = None
    status: str
    status_label: str
    public_status_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    events: List[ComplaintEventItem] = []

class OfficialComplaintListItem(BaseModel):
    id: str
    public_reference: str
    connection_id: Optional[str] = None
    fhtc_id: Optional[str] = None
    village_or_ward: Optional[str] = None
    category: str
    category_label: str
    description: str
    status: str
    assigned_to: Optional[str] = None
    assignee_name: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class OfficialComplaintDetail(BaseModel):
    id: str
    public_reference: str
    connection_id: Optional[str] = None
    fhtc_id: Optional[str] = None
    village_or_ward: Optional[str] = None
    household_reference: Optional[str] = None
    category: str
    category_label: str
    description: str
    started_at_approx: Optional[str] = None
    private_contact_phone: Optional[str] = None
    private_contact_name: Optional[str] = None
    photo_url: Optional[str] = None
    status: str
    assigned_to: Optional[str] = None
    assignee_name: Optional[str] = None
    public_status_message: Optional[str] = None
    internal_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    events: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)

class ComplaintAssignRequest(BaseModel):
    assigned_to: str
    internal_note: Optional[str] = None

class ComplaintStatusUpdateRequest(BaseModel):
    new_status: str
    public_message: Optional[str] = None
    internal_note: Optional[str] = None

class ComplaintFollowUpRequest(BaseModel):
    message: str

# ----------------- Settings & Integration Schemas -----------------
class ThresholdSettingsResponse(BaseModel):
    gram_panchayat_id: str
    min_flow_lpm: float
    min_pressure_bar: float
    max_pressure_bar: float
    stale_data_hours: int
    supply_window_start: str
    supply_window_end: str
    evening_window_start: str
    evening_window_end: str
    updated_at: datetime
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ThresholdSettingsUpdate(BaseModel):
    min_flow_lpm: Optional[float] = Field(None, ge=0.5, le=20.0)
    min_pressure_bar: Optional[float] = Field(None, ge=0.1, le=5.0)
    max_pressure_bar: Optional[float] = Field(None, ge=1.0, le=10.0)
    stale_data_hours: Optional[int] = Field(None, ge=1, le=48)
    supply_window_start: Optional[str] = None
    supply_window_end: Optional[str] = None
    evening_window_start: Optional[str] = None
    evening_window_end: Optional[str] = None

class IntegrationStatusResponse(BaseModel):
    imis_status: str # "UNCONFIGURED", "AVAILABLE", "SYNCED"
    imis_message: str
    last_sync_time: Optional[datetime] = None
    sujal_gaon_status: str
    sujal_gaon_message: str
    export_formats_supported: List[str] = ["CSV", "EXCEL"]
