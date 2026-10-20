def get_auth_token(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "sarpanch@shirsuphal.gp.gov.in",
        "password": "Official@123"
    })
    return res.json()["access_token"]

def test_dashboard_summary(client):
    token = get_auth_token(client)
    res = client.get("/api/v1/dashboard/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_connections"] >= 20
    assert data["gram_panchayat_name"] == "Shirsuphal Gram Panchayat"
    assert data["is_demo_data"] is True
    assert "data_freshness_status" in data

def test_list_connections_and_filter(client):
    token = get_auth_token(client)
    res = client.get("/api/v1/connections", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    conns = res.json()
    assert len(conns) >= 20

    # Test filtering by status
    crit_res = client.get("/api/v1/connections?status=Critical", headers={"Authorization": f"Bearer {token}"})
    assert crit_res.status_code == 200
    crit_conns = crit_res.json()
    for c in crit_conns:
        assert c["computed_status"] == "Critical"

def test_connection_detail_and_readings(client):
    token = get_auth_token(client)
    # Fetch conn-001
    res = client.get("/api/v1/connections/conn-001", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    conn = res.json()
    assert conn["fhtc_id"] == "MH-PUN-SHIR-001"
    assert conn["village_or_ward"] == "Ward 1 (Gaothan)"
    assert len(conn["recent_readings"]) > 0

    # Readings endpoint
    readings_res = client.get("/api/v1/connections/conn-001/readings?hours=24", headers={"Authorization": f"Bearer {token}"})
    assert readings_res.status_code == 200
    readings = readings_res.json()
    assert len(readings) > 0
    assert "flow_rate" in readings[0]
    assert "pressure" in readings[0]
