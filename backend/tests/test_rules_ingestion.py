from datetime import datetime, timezone

def test_sensor_ingestion_and_rule_alert(client):
    # Ingest a reading with zero flow during supply window (e.g. at 07:30 UTC / morning supply)
    now = datetime.now(timezone.utc)
    # Set time to 07:30 today
    supply_time = now.replace(hour=7, minute=30, second=0, microsecond=0)

    res = client.post(
        "/api/v1/ingest/readings",
        headers={"X-Device-Key": "dev-key-shirsuphal-001-secret"},
        json={
            "device_code": "JW-ESP32-001",
            "readings": [
                {
                    "device_code": "JW-ESP32-001",
                    "observed_at": supply_time.isoformat(),
                    "flow_rate": 0.0,
                    "pressure": 0.3,
                    "source": "device"
                }
            ]
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["accepted_count"] == 1
    assert data["alerts_triggered"] >= 1
