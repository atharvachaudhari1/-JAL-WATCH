import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    APP_ENV: str = "development"
    APP_NAME: str = "JalWatch API"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./jalwatch_dev.db"
    SECRET_KEY: str = "jalwatch-insecure-dev-secret-key-change-in-production-2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    DEMO_MODE: bool = True
    DEVICE_INGESTION_ENABLED: bool = True
    IMIS_INTEGRATION_ENABLED: bool = False
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 5

    @property
    def cors_origins(self) -> List[str]:
        origins = [self.FRONTEND_ORIGIN.strip()]
        # Also allow local dev ports (5173, 3000, 4173) in dev mode
        if self.APP_ENV == "development":
            extra_origins = [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:4173",
                "http://127.0.0.1:4173",
            ]
            for eo in extra_origins:
                if eo not in origins:
                    origins.append(eo)
        return origins

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
