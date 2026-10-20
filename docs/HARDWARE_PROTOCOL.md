# JalWatch --- Edge IoT Hardware Integration Protocol

## Overview
This document specifies the communication protocol between physical microcontrollers (e.g. ESP32, STM32 with Cellular/NB-IoT or LoRaWAN) and the JalWatch Backend Service.

## 1. Supported Sensors & Transducers
- **Flow Sensor:** YF-B5 / YF-S201 Hall-effect turbine flow sensor (1--30 L/min, ~450 pulses/L).
- **Pressure Transducer:** 0--10 bar piezoresistive ceramic pressure sensor (0.5V--4.5V analogue output or I2C ADS1115 ADC).
- **Water Quality Screening Probes:**
  - Analogue pH electrode (screening indicator for BIS 10500 range: 6.5--8.5).
  - Nephelometric Turbidity Sensor (screening threshold: 5.0 NTU).
  *(Note: Low-cost sensors provide screening indication only; they do not replace certified NABL laboratory testing).*

## 2. Ingestion Endpoint
- **URL:** `POST /api/v1/ingest/readings`
- **Authentication:** Header `X-Device-Key: <DEVICE_API_KEY>` or HMAC-SHA256 signature.
- **Content-Type:** `application/json`

## 3. Payload Format
```json
{
  "device_code": "JW-ESP32-001",
  "readings": [
    {
      "device_code": "JW-ESP32-001",
      "observed_at": "2026-10-20T07:15:00Z",
      "sequence_number": 1042,
      "flow_rate": 3.45,
      "flow_unit": "L/min",
      "volume": 1284.5,
      "pressure": 1.42,
      "pressure_unit": "bar",
      "turbidity": 1.2,
      "ph": 7.4,
      "battery_level": 94.2,
      "source": "device"
    }
  ]
}
```

## 4. Edge Reliability & Offline Buffering Workflow
1. **Sampling:** Device samples flow and pressure every 15 seconds during scheduled supply hours (and every 5 minutes during quiescent off-hours).
2. **Local Validation:** Values outside physical sensor limits (< 0 or > 50 L/min, < 0 or > 10 bar) are tagged with quality flags before transmission.
3. **FIFO Flash Queue:** If cellular/Wi-Fi connection fails, readings are appended to a SPIFFS/LittleFS flash FIFO queue (capacity: 2,000 readings / ~7 days).
4. **Batch Synchronization:** Upon reconnect, buffered readings are uploaded in batches of up to 50 records per HTTP POST.
5. **Idempotency:** The backend deduplicates records using `(device_id, observed_at, sequence_number)`.
6. **Heartbeat:** Device posts to `/api/v1/devices/{device_id}/heartbeat` every 30 minutes with battery telemetry.
