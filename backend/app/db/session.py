from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# SQLite specific connect_args (dev) vs PostgreSQL pool settings (prod)
connect_args = {}
engine_kwargs: dict = {
    "echo": False,
    "pool_pre_ping": True,
}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # PostgreSQL on Render free tier: keep pool small to avoid max-connection errors
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 2
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
