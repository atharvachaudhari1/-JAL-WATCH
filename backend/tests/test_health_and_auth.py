def test_health_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database_connected"] is True
    assert data["demo_mode"] is True

def test_login_success_official(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "sarpanch@shirsuphal.gp.gov.in",
        "password": "Official@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "sarpanch@shirsuphal.gp.gov.in"
    assert data["user"]["role"] == "gp_official"

def test_login_failure_bad_password(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "sarpanch@shirsuphal.gp.gov.in",
        "password": "WrongPassword123"
    })
    assert res.status_code == 401
    assert "Incorrect official email or password" in res.json()["detail"]

def test_auth_me(client):
    # First login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "sarpanch@shirsuphal.gp.gov.in",
        "password": "Official@123"
    })
    token = login_res.json()["access_token"]

    # Call /auth/me
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    user_data = res.json()
    assert user_data["name"] == "Aarti Kadam (Gram Sevak)"
