# 🎬 JalWatch — 5-Minute Video Presentation Script
### SIH 2026 | Problem Statement 26255 | Ministry of Jal Shakti

---

> **Format:** Screen recording + voiceover  
> **Total Time:** 5:00 minutes  
> **Sections:** 6 segments with on-screen actions

---

## 🎙️ SEGMENT 1 — Hook & Problem Statement
### ⏱️ `00:00 – 00:45` | *Show: Blank screen → Title slide or GP map*

---

**[VOICEOVER]**

> "India has connected **over 14 crore rural households** with tap water under the Jal Jeevan Mission.
> But here's the uncomfortable truth — **a tap connection doesn't guarantee water.**"

> "In thousands of Gram Panchayats across Maharashtra, officials have no way to know:
> — *Is water actually flowing today?*
> — *Is the pressure adequate?*
> — *Has a pipe burst at 3 AM?*
> — *Why is a citizen's complaint still unresolved after 5 days?*"

> "The answer today? **Manual inspection. Phone calls. Paper registers.**
> That's where **JalWatch** comes in."

---

## 🎙️ SEGMENT 2 — Solution Overview
### ⏱️ `00:45 – 01:30` | *Show: Architecture diagram or home screen*

---

**[VOICEOVER]**

> "JalWatch is a **real-time FHTC water supply monitoring and grievance redressal system**
> built specifically for Gram Panchayat officials and rural citizens."

> "It has three core parts:"

> "**One** — An IoT sensor node based on ESP32, installed at each household tap connection,
> that measures **flow rate, pressure, and ADC signal** — and sends data to the cloud every few minutes."

> "**Two** — A **Gram Panchayat Dashboard** — a real-time command centre for officials
> to monitor every tap, every alert, every citizen complaint — in one place."

> "**Three** — A **Villager Mobile Web App** — accessible on any basic smartphone,
> where citizens can **report problems and track complaint status** in their own language."

> "All three talk to a single **FastAPI backend** with a **PostgreSQL database**,
> deployed on the cloud — fully functional, right now."

---

## 🎙️ SEGMENT 3 — Live Hardware Demo
### ⏱️ `01:30 – 02:15` | *Show: Terminal or Postman → Dashboard updating*

---

**[VOICEOVER — while showing the POST request being sent]**

> "Let me show you the hardware integration first."

> "Our ESP32 device sends this JSON payload every 5 minutes:"

```json
{
  "household_id": "HH001",
  "flow_rate": 6.00,
  "status": "FUNCTIONAL",
  "adc": 4095,
  "supply_expected": true
}
```

> "That's it. Simple. Lightweight. Works even on 2G cellular."

> "The backend receives this at our `/ingest/hardware` endpoint —
> maps **HH001 to FHTC connection MH-PUN-SHIR-001**,
> stores the reading, **runs alert rules automatically**,
> and sends back the computed status to the device."

**[Switch to Dashboard — show HH001 card]**

> "And immediately — right here on the dashboard —
> you can see **HH001 is FUNCTIONAL**, flow rate is 6 litres per minute,
> pressure is 5 bar, ADC reading is 4095."

> "The **green pulse** tells the official — this tap is live. Water is flowing. All good."

---

## 🎙️ SEGMENT 4 — GP Dashboard Demo
### ⏱️ `02:15 – 03:30` | *Show: Dashboard → Alerts → Complaints pages*

---

**[VOICEOVER — navigate through dashboard]**

> "Now let's look at the official Gram Panchayat dashboard."

**[Show login page → click demo account → enter dashboard]**

> "Officials log in with their government email.
> The dashboard loads Shirsuphal Gram Panchayat's real-time data."

**[Point to KPI cards]**

> "At a glance — **20 registered FHTCs**, **15 active IoT meters**,
> **2 open alerts**, **1 citizen complaint** pending."

**[Click Alerts page]**

> "Here's the alert system. JalWatch detected that **HH-102's tap had zero flow
> during the 6 AM morning supply window** — that's a critical alert.
> The system fires it automatically — no human needed to check."

> "The official can **acknowledge, assign to a field worker, and resolve** — all from here.
> Every action is **audit-logged** for accountability."

**[Click Complaints page]**

> "Citizen complaints — submitted from a basic phone —
> appear here with full timeline tracking.
> You can see who reported it, when it was assigned, and what action was taken."

**[Click Connections → show table]**

> "Every tap connection has its own health status — Normal, Attention, Critical, or Offline.
> One click drills into the **24-hour telemetry graph** for that household."

---

## 🎙️ SEGMENT 5 — Villager Portal Demo
### ⏱️ `03:30 – 04:15` | *Show: `/villager` URL → Report Problem form*

---

**[VOICEOVER — navigate to villager portal]**

> "Now — the citizen side."

> "We navigate to the **Villager Portal** — no login, no app download, just a URL."

**[Show VillagerHome]**

> "This is what a rural citizen sees on their phone.
> Clean. Simple. Works in Hindi and Marathi."

**[Click Report Problem]**

> "To report a problem — they select the issue type,
> describe it in 2 lines, add their phone number, and submit."

> "They get a **tracking reference number** — like JW-2026-000103 —
> which they can use to check status anytime."

**[Click Track Complaint]**

> "They enter that reference number here — and they can see exactly where their complaint is:
> Submitted → Assigned → In Progress → Resolved."

> "No phone calls to the Gram Panchayat. No waiting. **Full transparency.**"

---

## 🎙️ SEGMENT 6 — Technical Stack & Impact
### ⏱️ `04:15 – 05:00` | *Show: Architecture slide or code snippets*

---

**[VOICEOVER]**

> "Under the hood — JalWatch is built with:"

> "**FastAPI + PostgreSQL** for the backend — fully RESTful, Swagger-documented,
> 9 out of 9 tests passing."

> "**React + TypeScript + Tailwind CSS** for the frontend —
> PWA-ready, mobile-first, offline-capable."

> "**ESP32 + Flow Sensor + Pressure Transducer** for hardware —
> communicates over cellular with a simple API key authentication."

> "**Rule-based alert engine** — fires on zero flow, low pressure, stale data, or sensor anomaly."

> "**ML anomaly detection baseline** — using scikit-learn Isolation Forest —
> catches statistical deviations that fixed rules miss."

> "Deployed on **Render cloud** — backend, frontend, PostgreSQL — all live."

> "JalWatch turns a **₹500 ESP32 sensor** into a tool that protects
> **water rights of rural families** — giving Gram Panchayats
> the visibility they need to actually deliver Jal Jeevan Mission's promise."

**[End on dashboard with HH001 green pulse]**

> "Real water. Real data. Real accountability. — **JalWatch.**"

---

## 📋 PRESENTATION CHECKLIST

| Segment | Duration | Screen Action |
|---|---|---|
| 1. Problem | 0:45 | Title / stats slide |
| 2. Solution | 0:45 | Architecture overview |
| 3. Hardware Demo | 0:45 | POST request → HH001 card live update |
| 4. GP Dashboard | 1:15 | Login → Dashboard → Alerts → Complaints |
| 5. Villager Portal | 0:45 | Report problem → Track complaint |
| 6. Stack & Impact | 0:45 | Tech slide → Dashboard closing shot |
| **Total** | **5:00** | |

---

## 🔑 KEY PHRASES TO EMPHASISE

- *"A tap connection doesn't guarantee water"* — opens with impact
- *"Works on 2G cellular"* — shows rural-first thinking
- *"No phone calls. No waiting. Full transparency."* — citizen value
- *"₹500 ESP32 sensor"* — cost-effective, scalable
- *"9 out of 9 tests passing"* — engineering credibility
- *"Real water. Real data. Real accountability."* — closing punch

---

## 🎬 RECORDING TIPS

> [!TIP]
> - Record at **1920×1080**, zoom browser to **125%** so text is readable
> - Use **OBS Studio** or **Loom** for screen + voiceover
> - Show the **HH001 live card update** as your WOW moment — audience loves seeing real hardware data appear on screen
> - Keep cursor movements **slow and deliberate**
> - Add **background music** at 10% volume (lo-fi / instrumental)
> - Export at **1080p MP4**, under 500MB

