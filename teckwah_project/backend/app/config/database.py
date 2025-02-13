# backend/app/config/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator
import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
import logging
from sqlalchemy.orm import registry
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
mapper_registry = registry()
Base = declarative_base()
# .env 파일 로드
load_dotenv()

# 환경변수에서 데이터베이스 설정 가져오기
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "1234")
MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "delivery_system")

# SQLAlchemy 데이터베이스 URL 생성
SQLALCHEMY_DATABASE_URL = (
    f"mysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
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
    from app.models import postal_code_model
    from app.models import user_model
    from app.models import dashboard_model
    from app.models import refresh_token_model
    from app.models import error_log_model

    # 명시적 모델 초기화
    mapper_registry.configure()


@contextmanager
def transaction(db: Session) -> Generator:
    """
    트랜잭션 컨텍스트 매니저
    사용 예:
    with transaction(db) as session:
        session.add(some_object)
    """
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction failed: {str(e)}")
        raise


def get_db():
    """데이터베이스 세션 제공"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_mysql_connection():
    """MySQL 직접 연결을 위한 커넥션 제공"""
    try:
        connection = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            port=MYSQL_PORT,
        )
        return connection
    except Error as e:
        logger.error(f"데이터베이스 연결 오류: {e}")
        return None


def execute_query(query, params=None, fetch=False, many=False):
    """
    MySQL 쿼리 실행을 위한 유틸리티 함수
    """
    connection = get_mysql_connection()
    if not connection:
        return None

    try:
        cursor = connection.cursor()
        if many:
            cursor.executemany(query, params)
        else:
            cursor.execute(query, params)

        if fetch:
            result = cursor.fetchall()
            return result

        connection.commit()
        return cursor.rowcount
    except Error as e:
        logger.error(f"쿼리 실행 오류: {e}")
        return None
    finally:
        cursor.close()
        connection.close()


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
