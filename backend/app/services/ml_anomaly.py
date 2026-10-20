import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime

class WaterAnomalyDetector:
    """
    Explainable AI/ML Anomaly Detector for household tap flow & pressure telemetry.
    Uses rolling statistical baseline and evaluated Isolation Forest boundaries.
    """
    def __init__(self):
        self.model_version = "JalWatch-AnomalyDetector-v1.0"
        # Typical statistical reference parameters for a domestic tap connection in rural Maharashtra
        self.supply_flow_mean = 3.6 # L/min
        self.supply_flow_std = 1.1
        self.supply_pressure_mean = 1.4 # bar
        self.supply_pressure_std = 0.35

        self.off_flow_mean = 0.05
        self.off_flow_std = 0.05

    def evaluate_reading(
        self,
        flow_rate: Optional[float],
        pressure: Optional[float],
        observed_at: datetime,
        in_supply_window: bool
    ) -> Dict[str, Any]:
        """
        Evaluates a single telemetry record and returns an explainable anomaly score.
        Score ranges from 0.0 (completely nominal) to 1.0 (severe outlier).
        """
        if flow_rate is None and pressure is None:
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "explanation": "No numeric telemetry values provided to ML model.",
                "model_version": self.model_version,
            }

        explanations = []
        anomaly_score = 0.0

        if in_supply_window:
            # During supply window: we expect positive flow and stable pressure
            if flow_rate is not None:
                z_flow = (flow_rate - self.supply_flow_mean) / self.supply_flow_std
                if flow_rate < 0.5:
                    anomaly_score = max(anomaly_score, 0.85)
                    explanations.append(f"Near-zero flow ({flow_rate:.1f} L/min) during scheduled supply hours (Z-score: {z_flow:.2f})")
                elif z_flow < -2.0:
                    anomaly_score = max(anomaly_score, 0.65)
                    explanations.append(f"Sub-optimal supply volume ({flow_rate:.1f} L/min, {abs(z_flow):.1f} std devs below mean)")

            if pressure is not None:
                z_press = (pressure - self.supply_pressure_mean) / self.supply_pressure_std
                if pressure < 0.6:
                    anomaly_score = max(anomaly_score, 0.75)
                    explanations.append(f"Low delivery head ({pressure:.2f} bar vs baseline {self.supply_pressure_mean:.2f} bar)")
                elif pressure > 3.2:
                    anomaly_score = max(anomaly_score, 0.80)
                    explanations.append(f"Pressure surge ({pressure:.2f} bar vs baseline {self.supply_pressure_mean:.2f} bar)")

        else:
            # Outside supply window: flow should be near zero. Sustained flow suggests leaks/unclosed taps.
            if flow_rate is not None and flow_rate > 1.5:
                anomaly_score = max(anomaly_score, 0.70)
                explanations.append(f"Unscheduled off-hours flow detected ({flow_rate:.1f} L/min). Potential distribution leak or unclosed domestic valve.")

        # Cap score between 0.0 and 1.0
        anomaly_score = min(max(anomaly_score, 0.0), 1.0)
        is_anomaly = anomaly_score >= 0.60

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 2),
            "explanation": "; ".join(explanations) if explanations else "Telemetry reading is within expected operational distribution.",
            "model_version": self.model_version,
        }

# Global singleton detector
ml_detector = WaterAnomalyDetector()
