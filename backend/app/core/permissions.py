from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    GP_OFFICIAL = "gp_official"
    FIELD_WORKER = "field_worker"

class ComplaintStatus(str, Enum):
    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DUPLICATE = "duplicate"
    REJECTED = "rejected"

class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    ATTENTION = "ATTENTION"
    INFO = "INFO"

class AlertStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"

class ConnectionHealthStatus(str, Enum):
    NORMAL = "Normal"
    ATTENTION = "Attention"
    CRITICAL = "Critical"
    UNKNOWN = "Unknown"
    OFFLINE = "Offline"
