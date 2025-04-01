# teckwah_project/server/config/database.py
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from server.config.settings import get_settings

logger = logging.getLogger(__name__)
Base = declarative_base()

settings = get_settings()

# MySQL 호스트 환경변수 사용 개선
SQLALCHEMY_DATABASE_URL = (
    f"mysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}@{settings.MYSQL_HOST}:"
    f"{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}?charset={settings.MYSQL_CHARSET}"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=16, 
    max_overflow=32,  
)


@event.listens_for(engine, "connect")
def set_timezone(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET time_zone = '+09:00'")
    # 락 타임아웃 설정 (초 단위, settings에서 가져옴)
    cursor.execute(f"SET innodb_lock_wait_timeout = {settings.LOCK_TIMEOUT_SECONDS}")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """SQLAlchemy 데이터베이스 세션 제공"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
