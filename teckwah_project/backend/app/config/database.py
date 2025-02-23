# backend/app/config/database.py
import logging
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, registry
from mysql.connector import Error
import mysql.connector
from app.config.settings import get_settings

logger = logging.getLogger(__name__)
mapper_registry = registry()
Base = declarative_base()

settings = get_settings()
MYSQL_USER = settings.MYSQL_USER
MYSQL_PASSWORD = settings.MYSQL_PASSWORD
MYSQL_HOST = settings.MYSQL_HOST
MYSQL_PORT = settings.MYSQL_PORT
MYSQL_DATABASE = settings.MYSQL_DATABASE
MYSQL_CHARSET = settings.MYSQL_CHARSET

SQLALCHEMY_DATABASE_URL = (
    f"mysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    f"?charset={MYSQL_CHARSET}"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=32,
    max_overflow=64,
)

@event.listens_for(engine, "connect")
def set_timezone(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET time_zone = '+09:00'")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """SQLAlchemy 데이터베이스 세션 제공"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DatabaseManager:
    """데이터베이스 작업 관리자"""
    def __init__(self, session: Session):
        self.session = session

    @contextmanager
    def transaction(self):
        """트랜잭션 범위 관리"""
        try:
            yield self.session
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            logger.error(f"Transaction failed: {str(e)}")
            raise

    def bulk_save(self, objects: list, batch_size: int = 1000):
        """대량 데이터 저장"""
        try:
            for i in range(0, len(objects), batch_size):
                batch = objects[i : i + batch_size]
                self.session.bulk_save_objects(batch)
                self.session.flush()
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            logger.error(f"Bulk save failed: {str(e)}")
            raise