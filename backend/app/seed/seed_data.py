import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.entities import (
    GramPanchayat,
    User,
    Connection,
    Device,
    SensorReading,
    Alert,
    Complaint,
    ComplaintEvent,
    ThresholdSetting,
    DeviceCalibration,
    IntegrationSyncLog,
    AuditLog,
)
from app.core.permissions import UserRole, AlertSeverity, AlertStatus, ComplaintStatus

def seed_database(db: Session):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Check if already seeded
    existing_gp = db.query(GramPanchayat).filter(GramPanchayat.name == "Shirsuphal Gram Panchayat").first()
    if existing_gp:
        print("Database already contains seed data for Shirsuphal Gram Panchayat.")
        return

    print("Seeding JalWatch database with demonstration fixtures...")

    now = datetime.now(timezone.utc)

    # 1. Create Gram Panchayat
    gp = GramPanchayat(
        id="gp-shirsuphal-pune",
        name="Shirsuphal Gram Panchayat",
        district="Pune",
        state="Maharashtra",
        official_external_id="LGD-GP-187263",
        created_at=now - timedelta(days=60)
    )
    db.add(gp)
    db.flush()

    # 2. Create Threshold Settings
    thresholds = ThresholdSetting(
        gram_panchayat_id=gp.id,
        min_flow_lpm=2.0,
        min_pressure_bar=0.7,
        max_pressure_bar=3.0,
        stale_data_hours=6,
        supply_window_start="06:00",
        supply_window_end="09:00",
        evening_window_start="17:30",
        evening_window_end="20:00",
        updated_at=now - timedelta(days=10),
        updated_by="System Initializer"
    )
    db.add(thresholds)

    # 3. Create Official Users
    admin_user = User(
        id="user-admin-01",
        name="Sunil Deshmukh (Admin)",
        email="admin@jalwatch.gov.in",
        password_hash=get_password_hash("Admin@123"),
        role=UserRole.ADMIN,
        gram_panchayat_id=gp.id,
        phone="+919822001122",
        is_active=True
    )
    official_user = User(
        id="user-official-01",
        name="Aarti Kadam (Gram Sevak)",
        email="sarpanch@shirsuphal.gp.gov.in",
        password_hash=get_password_hash("Official@123"),
        role=UserRole.GP_OFFICIAL,
        gram_panchayat_id=gp.id,
        phone="+919822112233",
        is_active=True
    )
    field_worker = User(
        id="user-field-01",
        name="Ramesh Jadhav (Jal Karmi / Plumber)",
        email="field.ramesh@shirsuphal.gp.gov.in",
        password_hash=get_password_hash("Field@123"),
        role=UserRole.FIELD_WORKER,
        gram_panchayat_id=gp.id,
        phone="+919822223344",
        is_active=True
    )
    db.add_all([admin_user, official_user, field_worker])
    db.flush()

    # 4. Create Devices & Connections
    wards = ["Ward 1 (Gaothan)", "Ward 2 (Vikas Nagar)", "Ward 3 (Bhim Nagar)", "Ward 4 (Malshiras Road)"]
    households = [
        ("HH001 (Patil)",        wards[0]),  # ← HH001: primary demo device, FUNCTIONAL
        ("HH-102 (Shinde)",      wards[0]),
        ("HH-103 (Kadam)",       wards[0]),
        ("HH-104 (Bhosale)",     wards[0]),
        ("HH-105 (Gaikwad)",     wards[1]),
        ("HH-106 (More)",        wards[1]),
        ("HH-107 (Pawar)",       wards[1]),
        ("HH-108 (Salunke)",     wards[1]),
        ("HH-109 (Chavan)",      wards[2]),
        ("HH-110 (Mane)",        wards[2]),
        ("HH-111 (Kamble)",      wards[2]),
        ("HH-112 (Lokhande)",    wards[2]),
        ("HH-113 (Thorat)",      wards[3]),
        ("HH-114 (Jagtap)",      wards[3]),
        ("HH-115 (Wagh)",        wards[3]),
        ("HH-116 (Shinde-West)", wards[3]),
        ("HH-117 (Gholap)",      wards[0]),
        ("HH-118 (Deshmukh-East)", wards[1]),
        ("HH-119 (Suryavanshi)", wards[2]),
        ("HH-120 (Tambe)",       wards[3]),
    ]

    connections = []
    devices = []

    for idx, (hh_ref, ward) in enumerate(households, start=1):
        fhtc_id = f"MH-PUN-SHIR-{idx:03d}"
        dev_code = f"JW-ESP32-{idx:03d}"
        api_key = f"dev-key-shirsuphal-{idx:03d}-secret"

        # Special scenario cases:
        # idx 1: Nominal healthy connection
        # idx 2: No-flow problem (Critical Alert)
        # idx 3: Low terminal pressure (Attention Alert)
        # idx 4: Offline / Stale telemetry (Offline status)
        # idx 5: Sensor anomaly (out of range)
        # idx 6: Recent citizen complaint (Assigned)
        # idx 7: Resolved complaint
        # idx 16-20: Unmonitored (No physical device paired)

        has_device = idx <= 15
        device = None
        if has_device:
            last_seen = now - timedelta(minutes=5)
            health = "HEALTHY"
            battery = 94.0 - (idx * 1.5)

            if idx == 4: # Stale connection
                last_seen = now - timedelta(hours=22)
                health = "OFFLINE"
                battery = 12.0
            elif idx == 5: # Sensor anomaly
                health = "DEGRADED"

            device = Device(
                id=f"device-{idx:03d}",
                device_code=dev_code,
                device_type="ESP32-WROOM-CELLULAR",
                firmware_version="1.2.0-demo",
                api_key=api_key,
                last_seen_at=last_seen,
                health_status=health,
                battery_level=max(10.0, battery),
                registered_at=now - timedelta(days=30)
            )
            devices.append(device)
            db.add(device)
            db.flush()

        conn = Connection(
            id=f"conn-{idx:03d}",
            fhtc_id=fhtc_id,
            gram_panchayat_id=gp.id,
            village_or_ward=ward,
            household_reference=hh_ref,
            device_id=device.id if device else None,
            supply_schedule_json=json.dumps({
                "morning_start": "06:00",
                "morning_end": "09:00",
                "evening_start": "17:30",
                "evening_end": "20:00"
            }),
            created_at=now - timedelta(days=30)
        )
        connections.append(conn)
        db.add(conn)
        db.flush()

    # 5. Populate Time-series Sensor Readings (last 24 hours, hourly data points)
    readings = []
    for conn in connections:
        if not conn.device_id:
            continue

        conn_num = int(conn.fhtc_id.split("-")[-1])

        # How many hours back
        hours_back = 24
        if conn_num == 4: # Offline device stopped transmitting 20 hours ago
            hours_back = 4 # Only readings from 24h to 20h ago

        for h in range(hours_back, -1, -1):
            reading_time = now - timedelta(hours=h)
            hour_of_day = reading_time.hour

            is_morning_supply = 6 <= hour_of_day < 9
            is_evening_supply = 17 <= hour_of_day < 20
            is_supply = is_morning_supply or is_evening_supply

            flow = 0.0
            pressure = 0.0
            volume = 1250.0 + (24 - h) * 45.0
            turbidity = 1.2
            ph = 7.4
            flags = ["OK"]

            if is_supply:
                if conn_num == 2:
                    # Fault: Zero flow during supply window!
                    flow = 0.0
                    pressure = 0.4
                    flags = ["ZERO_FLOW", "SUPPLY_ACTIVE"]
                elif conn_num == 3:
                    # Low pressure issue
                    flow = 1.8
                    pressure = 0.45
                    flags = ["LOW_PRESSURE"]
                elif conn_num == 5:
                    # Impossible reading
                    flow = 4.2
                    pressure = -0.5
                    flags = ["INVALID_VALUE"]
                else:
                    # Nominal active flow
                    flow = round(3.4 + (conn_num % 3) * 0.4, 2)
                    pressure = round(1.35 + (conn_num % 4) * 0.1, 2)
            else:
                # Off-hours: should be quiet
                flow = 0.0
                pressure = 0.2

            sr = SensorReading(
                device_id=conn.device_id,
                connection_id=conn.id,
                observed_at=reading_time,
                received_at=reading_time + timedelta(seconds=12),
                flow_rate=flow,
                volume=volume,
                pressure=pressure,
                turbidity=turbidity,
                ph=ph,
                source="demo",
                sequence_number=1000 + (24 - h),
                quality_flags_json=json.dumps(flags)
            )
            readings.append(sr)

    db.add_all(readings)
    db.flush()

    # ── HH001 pinned live reading (your hardware device default payload) ──────
    # Ensures HH001 always shows as FUNCTIONAL with flow_rate=6.0 L/min on dashboard
    hh001_conn = db.query(Connection).filter(Connection.id == "conn-001").first()
    if hh001_conn and hh001_conn.device_id:
        # ADC 4095 → pressure = (4095/4095) * 5.0 = 5.0 bar (full scale)
        hh001_pinned = SensorReading(
            device_id=hh001_conn.device_id,
            connection_id=hh001_conn.id,
            observed_at=now - timedelta(minutes=2),   # 2 minutes ago = "live"
            received_at=now - timedelta(minutes=2),
            flow_rate=6.00,
            pressure=round((4095 / 4095.0) * 5.0, 2),  # = 5.0 bar
            volume=8400.0,
            turbidity=1.1,
            ph=7.3,
            source="device",
            sequence_number=9001,
            quality_flags_json=json.dumps(["VALIDATED", "FUNCTIONAL"])
        )
        db.add(hh001_pinned)

    # 6. Create Realistic Rule-Based Alerts
    # Alert for Connection 2 (No flow during supply window)
    alert1 = Alert(
        id="alert-demo-001",
        connection_id="conn-002",
        device_id="device-002",
        gram_panchayat_id=gp.id,
        alert_type="NO_FLOW_SUPPLY_WINDOW",
        severity=AlertSeverity.CRITICAL,
        title="Zero Flow Detected During Scheduled Morning Supply",
        reason="Measured flow rate is 0.0 L/min during peak supply window (06:00-09:00). Probable distribution valve blockage or dry branch feeder.",
        evidence_json=json.dumps({
            "measured_flow_lpm": 0.0,
            "min_required_flow": 2.0,
            "window": "06:00-09:00",
            "fhtc_id": "MH-PUN-SHIR-002"
        }),
        rule_version="v1.0.0",
        status=AlertStatus.OPEN,
        triggered_at=now - timedelta(hours=2, minutes=15),
        dedupe_key="conn-002:NO_FLOW_SUPPLY_WINDOW:recent"
    )

    # Alert for Connection 3 (Low Pressure)
    alert2 = Alert(
        id="alert-demo-002",
        connection_id="conn-003",
        device_id="device-003",
        gram_panchayat_id=gp.id,
        alert_type="LOW_PRESSURE",
        severity=AlertSeverity.ATTENTION,
        title="Low Terminal Water Pressure",
        reason="Terminal water pressure dropped to 0.45 bar (below threshold 0.70 bar).",
        evidence_json=json.dumps({
            "measured_pressure_bar": 0.45,
            "min_pressure_threshold": 0.70,
            "fhtc_id": "MH-PUN-SHIR-003"
        }),
        rule_version="v1.0.0",
        status=AlertStatus.INVESTIGATING,
        assigned_to=field_worker.id,
        triggered_at=now - timedelta(hours=3, minutes=40),
        dedupe_key="conn-003:LOW_PRESSURE:recent"
    )

    # Alert for Connection 5 (Sensor Signal Anomaly)
    alert3 = Alert(
        id="alert-demo-003",
        connection_id="conn-005",
        device_id="device-005",
        gram_panchayat_id=gp.id,
        alert_type="SENSOR_ANOMALY",
        severity=AlertSeverity.INFO,
        title="Sensor Signal Validation Failure",
        reason="Physical telemetry value out of realistic bounds (pressure=-0.5 bar). Probable transducer wire fault.",
        evidence_json=json.dumps({
            "flow_rate": 4.2,
            "pressure": -0.5,
            "fhtc_id": "MH-PUN-SHIR-005"
        }),
        rule_version="v1.0.0",
        status=AlertStatus.OPEN,
        triggered_at=now - timedelta(hours=1, minutes=10),
        dedupe_key="conn-005:SENSOR_ANOMALY:recent"
    )

    db.add_all([alert1, alert2, alert3])
    db.flush()

    # 7. Create Demo Complaints & Timeline Events
    # Complaint 1: Active low pressure complaint
    c1 = Complaint(
        id="complaint-001",
        public_reference="JW-2026-000101",
        connection_id="conn-003",
        gram_panchayat_id=gp.id,
        category="low_pressure",
        description="Water pressure has been very trickle-thin during the morning supply since yesterday. It takes almost 40 minutes to fill one 200L household drum.",
        started_at_approx="Yesterday morning",
        private_contact_phone="+919890123456",
        private_contact_name="Dnyaneshwar Kadam",
        status=ComplaintStatus.IN_PROGRESS,
        assigned_to=field_worker.id,
        public_status_message="Technician assigned. Inspection of pipeline branch and pressure reducing valve scheduled for today.",
        internal_notes="Checking PRV chamber on Ward 1 branch line.",
        created_at=now - timedelta(hours=18),
        updated_at=now - timedelta(hours=2)
    )
    db.add(c1)
    db.flush()

    ev1 = ComplaintEvent(
        complaint_id=c1.id,
        actor_name="Dnyaneshwar Kadam (Citizen)",
        event_type="citizen_submission",
        public_message="Complaint registered via JalWatch Villager Portal.",
        created_at=now - timedelta(hours=18)
    )
    ev2 = ComplaintEvent(
        complaint_id=c1.id,
        actor_user_id=official_user.id,
        actor_name=official_user.name,
        event_type="assignment",
        old_status=ComplaintStatus.SUBMITTED,
        new_status=ComplaintStatus.ASSIGNED,
        public_message="Assigned to Ramesh Jadhav (Jal Karmi) for physical site verification.",
        internal_note="Please check if upstream sluice valve 4 is fully open.",
        created_at=now - timedelta(hours=14)
    )
    ev3 = ComplaintEvent(
        complaint_id=c1.id,
        actor_user_id=field_worker.id,
        actor_name=field_worker.name,
        event_type="status_change",
        old_status=ComplaintStatus.ASSIGNED,
        new_status=ComplaintStatus.IN_PROGRESS,
        public_message="Technician is on-site clearing silt from the branch strainer.",
        internal_note="Strainer partially clogged with grit. Flushed and monitoring pressure head.",
        created_at=now - timedelta(hours=2)
    )
    db.add_all([ev1, ev2, ev3])

    # Complaint 2: Resolved broken tap complaint
    c2 = Complaint(
        id="complaint-002",
        public_reference="JW-2026-000102",
        connection_id="conn-007",
        gram_panchayat_id=gp.id,
        category="damaged_pipe",
        description="Public tap ferrule connector cracked due to tractor movement near road edge. Water was leaking continuously.",
        started_at_approx="Two days ago",
        private_contact_phone="+919890234567",
        private_contact_name="Sunita Pawar",
        status=ComplaintStatus.RESOLVED,
        assigned_to=field_worker.id,
        public_status_message="Ferrule fitting and pipe sleeve replaced. Leak arrested and tap pressure confirmed normal.",
        internal_notes="Replaced 20mm GI nipple and reinforced with concrete casing.",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(hours=8),
        resolved_at=now - timedelta(hours=8)
    )
    db.add(c2)
    db.flush()

    ev4 = ComplaintEvent(
        complaint_id=c2.id,
        actor_name="Sunita Pawar (Citizen)",
        event_type="citizen_submission",
        public_message="Complaint registered via JalWatch Villager Portal.",
        created_at=now - timedelta(days=2)
    )
    ev5 = ComplaintEvent(
        complaint_id=c2.id,
        actor_user_id=field_worker.id,
        actor_name=field_worker.name,
        event_type="status_change",
        old_status=ComplaintStatus.IN_PROGRESS,
        new_status=ComplaintStatus.RESOLVED,
        public_message="Repairs completed. Standpost connection restored and functional.",
        internal_note="Work verified by Ward 1 committee member.",
        created_at=now - timedelta(hours=8)
    )
    db.add_all([ev4, ev5])

    # 8. Calibration record (Phase 2 readiness)
    calib = DeviceCalibration(
        device_id="device-001",
        calibrated_at=now - timedelta(days=15),
        performed_by="Nashik Flow Calibration Lab / GP Tech",
        reference_method="Gravimetric 20L Bucket Test & Digital Manometer",
        result="K-factor calibrated to 452 pulses/L. Pressure transducer verified at 1.5 bar (±0.02 bar).",
        next_due_at=now + timedelta(days=165)
    )
    db.add(calib)

    # 9. Audit log entries
    audit1 = AuditLog(
        actor_user_id=official_user.id,
        actor_email=official_user.email,
        gram_panchayat_id=gp.id,
        action="UPDATE_SUPPLY_SCHEDULE",
        entity_type="threshold_setting",
        entity_id=thresholds.id,
        metadata_json=json.dumps({"morning": "06:00-09:00", "evening": "17:30-20:00"}),
        created_at=now - timedelta(days=10)
    )
    audit2 = AuditLog(
        actor_user_id=official_user.id,
        actor_email=official_user.email,
        gram_panchayat_id=gp.id,
        action="ASSIGN_COMPLAINT",
        entity_type="complaint",
        entity_id=c1.id,
        metadata_json=json.dumps({"assigned_to": field_worker.name, "ref": c1.public_reference}),
        created_at=now - timedelta(hours=14)
    )
    db.add_all([audit1, audit2])

    db.commit()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
