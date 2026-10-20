def get_auth_token(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "sarpanch@shirsuphal.gp.gov.in",
        "password": "Official@123"
    })
    return res.json()["access_token"]

def test_full_complaint_lifecycle(client):
    # 1. Villager submits complaint via public endpoint
    sub_res = client.post("/api/v1/public/complaints", json={
        "connection_id_or_fhtc": "MH-PUN-SHIR-001",
        "category": "leakage",
        "description": "Noticeable pipe joint leak near the exterior masonry wall.",
        "started_at_approx": "Since this morning",
        "contact_phone": "+919876543210",
        "contact_name": "Kavita Patil",
        "consent_given": True
    })
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    ref = sub_data["public_reference"]
    assert ref.startswith("JW-2026-")
    assert sub_data["status"] == "submitted"

    # 2. Villager tracks the complaint using public reference
    track_res = client.post("/api/v1/public/complaints/track", json={
        "public_reference": ref,
        "contact_phone": "+919876543210"
    })
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["public_reference"] == ref
    assert track_data["status"] == "submitted"
    assert len(track_data["events"]) >= 1

    # 3. GP Official views complaint in official dashboard list
    token = get_auth_token(client)
    list_res = client.get("/api/v1/complaints", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    complaints = list_res.json()
    matched = next((c for c in complaints if c["public_reference"] == ref), None)
    assert matched is not None
    complaint_id = matched["id"]

    # 4. Official assigns complaint to field worker
    assign_res = client.post(
        f"/api/v1/complaints/{complaint_id}/assign",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "assigned_to": "user-field-01",
            "internal_note": "Assigned to Ramesh for leak clamp installation."
        }
    )
    assert assign_res.status_code == 200

    # 5. Field worker updates status to in_progress with public update
    update_res = client.post(
        f"/api/v1/complaints/{complaint_id}/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "new_status": "in_progress",
            "public_message": "Plumber arrived on-site and is replacing the leaking 15mm compression socket.",
            "internal_note": "Socket had damaged Teflon tape and stress crack."
        }
    )
    assert update_res.status_code == 200

    # 6. Official resolves complaint
    resolve_res = client.post(
        f"/api/v1/complaints/{complaint_id}/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "new_status": "resolved",
            "public_message": "Repair completed and verified. Pressure test confirmed zero leakage.",
            "internal_note": "Resolved and signed off by supervisor."
        }
    )
    assert resolve_res.status_code == 200

    # 7. Citizen tracks again: sees resolved status and public updates, without internal notes
    final_track = client.post("/api/v1/public/complaints/track", json={
        "public_reference": ref
    })
    assert final_track.status_code == 200
    final_data = final_track.json()
    assert final_data["status"] == "resolved"
    # Ensure internal notes are NOT present in public response
    for ev in final_data["events"]:
        assert not hasattr(ev, "internal_note")
        assert "stress crack" not in (ev.get("public_message") or "")
