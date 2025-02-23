# backend/app/config/database.py

import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, registry
from mysql.connector import Error
import mysql.connector

from app.config.settings import get_settings

logger = logging.getLogger(__name__)
mapper_registry = registry()
Base = declarative_base()

# settings에서 DB 관련 설정 불러오기
settings = get_settings()
MYSQL_USER = settings.MYSQL_USER
MYSQL_PASSWORD = settings.MYSQL_PASSWORD
MYSQL_HOST = settings.MYSQL_HOST
MYSQL_PORT = settings.MYSQL_PORT
MYSQL_DATABASE = settings.MYSQL_DATABASE
MYSQL_CHARSET = settings.MYSQL_CHARSET

# SQLAlchemy 데이터베이스 URL 생성 (charset 옵션 추가)
SQLALCHEMY_DATABASE_URL = (
    f"mysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    f"?charset={MYSQL_CHARSET}"
)

# SQLAlchemy 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # 연결 유효성 검사
    pool_recycle=3600,  # 커넥션 재사용 시간 (1시간)
    pool_size=32,
    max_overflow=64,
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def initialize_models():
    """모델 초기화 함수"""
    from app.models import (
        postal_code_model,
        user_model,
        dashboard_model,
        refresh_token_model,
        error_log_model,
    )

    # PostalCode와 PostalCodeDetail 모델이 먼저 초기화되도록 순서 지정
    PostalCode = postal_code_model.PostalCode
    PostalCodeDetail = postal_code_model.PostalCodeDetail
    Dashboard = dashboard_model.Dashboard

    # 명시적 모델 초기화
    mapper_registry.configure()




def get_db():
    """SQLAlchemy 데이터베이스 세션 제공"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mysql_connection():
    """mysql.connector를 이용한 직접 연결을 위한 커넥션 제공"""
    try:
        connection = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            port=MYSQL_PORT,
            charset=MYSQL_CHARSET,
        )
        return connection
    except Error as e:
        logger.error(f"데이터베이스 연결 오류: {e}")
        return None


class DatabaseManager:
    """
    데이터베이스 작업 관리자
    - 트랜잭션 관리
    - 벌크 작업 최적화
    - 연결 관리
    """

    def __init__(self, session: Session):
        self.session = session

    @contextmanager
    def transaction(self) -> Generator[Session, None, None]:
        """
        트랜잭션 범위 관리
        사용 예:
            with db_manager.transaction() as session:
                session.add(some_object)
        """
        try:
            yield self.session
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            logger.error(f"Transaction failed: {str(e)}")
            raise

    def bulk_save(self, objects: list, batch_size: int = 1000):
        """대량 데이터 저장 최적화"""
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

    def execute_in_transaction(self, func, *args, **kwargs):
        """함수를 트랜잭션 내에서 실행"""
        with self.transaction():
            return func(*args, **kwargs)
