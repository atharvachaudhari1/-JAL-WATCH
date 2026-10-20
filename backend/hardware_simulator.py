"""
JalWatch IoT Hardware & Edge Device Simulator
Simulates ESP32 / Cellular RTU water-meter telemetry with local buffering,
re-transmission on reconnect, and fault injection for hackathon demonstration.

Usage:
    python hardware_simulator.py --device JW-ESP32-001 --mode normal --interval 10
    python hardware_simulator.py --device JW-ESP32-001 --mode fault-no-flow
    python hardware_simulator.py --device JW-ESP32-001 --mode fault-low-pressure
    python hardware_simulator.py --device JW-ESP32-001 --mode batch-sync
"""

import sys
import time
import argparse
import random
from datetime import datetime, timezone, timedelta
import httpx

API_BASE_URL = "http://localhost:8000/api/v1"

# Demo device credentials
DEVICE_KEYS = {
    "JW-ESP32-001": "dev-key-shirsuphal-001-secret",
    "JW-ESP32-002": "dev-key-shirsuphal-002-secret",
    "JW-ESP32-003": "dev-key-shirsuphal-003-secret",
}

class EdgeDeviceSimulator:
    def __init__(self, device_code: str, api_base_url: str = API_BASE_URL):
        self.device_code = device_code
        self.api_key = DEVICE_KEYS.get(device_code, "dev-key-shirsuphal-001-secret")
        self.api_base_url = api_base_url
        self.sequence_number = 100
        self.cumulative_volume = 1500.0
        self.battery_level = 95.0
        self.local_buffer = []

    def sample_sensors(self, mode: str = "normal") -> dict:
        self.sequence_number += 1
        now = datetime.now(timezone.utc)
        self.battery_level = max(5.0, self.battery_level - 0.05)

        flow_rate = 3.6 + random.uniform(-0.3, 0.4)
        pressure = 1.45 + random.uniform(-0.1, 0.15)
        turbidity = 1.2 + random.uniform(-0.1, 0.2)
        ph = 7.4 + random.uniform(-0.1, 0.1)

        if mode == "fault-no-flow":
            flow_rate = 0.0
            pressure = 0.35
        elif mode == "fault-low-pressure":
            flow_rate = 1.6
            pressure = 0.42
        elif mode == "fault-surge":
            flow_rate = 5.2
            pressure = 3.8
        elif mode == "fault-sensor-drift":
            flow_rate = -1.5 # impossible negative
            pressure = -0.4

        self.cumulative_volume += (flow_rate * 0.1)

        return {
            "device_code": self.device_code,
            "observed_at": now.isoformat(),
            "sequence_number": self.sequence_number,
            "flow_rate": round(flow_rate, 2),
            "flow_unit": "L/min",
            "volume": round(self.cumulative_volume, 1),
            "pressure": round(pressure, 2),
            "pressure_unit": "bar",
            "turbidity": round(turbidity, 2),
            "ph": round(ph, 2),
            "battery_level": round(self.battery_level, 1),
            "source": "device"
        }

    def transmit(self, payload_list: list) -> bool:
        url = f"{self.api_base_url}/ingest/readings"
        headers = {
            "X-Device-Key": self.api_key,
            "Content-Type": "application/json"
        }
        body = {
            "device_code": self.device_code,
            "readings": payload_list
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, headers=headers, json=body)
                if res.status_code == 200:
                    data = res.json()
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Transmit SUCCESS: Ingested {data['accepted_count']} records, {data['alerts_triggered']} alerts triggered.")
                    return True
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Transmit REJECTED ({res.status_code}): {res.text}")
                    return False
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Transmit NETWORK ERROR: {e}. Buffering locally.")
            return False

    def run_continuous(self, mode: str = "normal", interval: int = 5, max_iterations: int = 10):
        print(f"Starting JalWatch Edge Simulator: Device={self.device_code}, Mode={mode}, Interval={interval}s")
        for i in range(max_iterations):
            reading = self.sample_sensors(mode=mode)
            self.local_buffer.append(reading)

            # Try flushing buffer
            success = self.transmit(self.local_buffer)
            if success:
                self.local_buffer.clear()
            else:
                print(f"Buffered {len(self.local_buffer)} readings locally in flash memory.")

            time.sleep(interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JalWatch IoT Hardware Simulator")
    parser.add_argument("--device", default="JW-ESP32-001", help="Device Code")
    parser.add_argument("--mode", default="normal", choices=["normal", "fault-no-flow", "fault-low-pressure", "fault-surge", "fault-sensor-drift"])
    parser.add_argument("--interval", type=int, default=5, help="Sampling interval in seconds")
    parser.add_argument("--count", type=int, default=3, help="Number of telemetry cycles")
    args = parser.parse_args()

    sim = EdgeDeviceSimulator(args.device)
    sim.run_continuous(mode=args.mode, interval=args.interval, max_iterations=args.count)
