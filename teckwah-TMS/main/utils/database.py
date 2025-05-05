"""
데이터베이스 연결 설정
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging
from functools import wraps
from fastapi import Depends
import os

from main.utils.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)

# 환경에 따른 데이터베이스 연결 정보 로깅
logger.info("=== 데이터베이스 설정 확인 ===")
logger.info(f"MYSQL_HOST: {settings.MYSQL_HOST}")
logger.info(f"MYSQL_PORT: {settings.MYSQL_PORT}")
logger.info(f"MYSQL_DATABASE: {settings.MYSQL_DATABASE}")
logger.info(f"GAE_ENV: {os.getenv('GAE_ENV', '없음')}")
logger.info(f"연결 URL 패턴: mysql+pymysql://[user]@{settings.MYSQL_HOST}{'/' if os.getenv('GAE_ENV', '').startswith('standard') else ':' + str(settings.MYSQL_PORT) + '/'}{settings.MYSQL_DATABASE}")
logger.info("===========================")

# SQLAlchemy 엔진 생성
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 연결 유효성 검사
    pool_recycle=3600,  # 1시간마다 연결 재활용
    pool_size=5,  # 연결 풀 크기
    max_overflow=10,  # 최대 초과 연결 수
)

# 세션 팩토리 생성
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 모델 생성
Base = declarative_base()


# 데이터베이스 연결 테스트
def test_db_connection():
    """
    데이터베이스 연결을 간단히 테스트하고 결과 로그를 남깁니다.
    프로젝트 규칙에 따라 최초 한 번만 시도합니다.
    """
    from sqlalchemy import text

    try:
        logger.info("데이터베이스 연결 테스트 시작...")
        logger.info(f"환경: {'GAE 프로덕션' if os.getenv('GAE_ENV', '').startswith('standard') else '로컬/개발'}")
        logger.info(
            f"연결 정보: {settings.MYSQL_HOST}:{settings.MYSQL_PORT}, 데이터베이스: {settings.MYSQL_DATABASE}, 사용자: {settings.MYSQL_USER}"
        )

        # 간단한 쿼리로 연결 테스트 (SQLAlchemy 2.0 호환)
        with engine.connect() as conn:
            # text() 함수를 사용하여 문자열 쿼리를 실행 가능한 객체로 변환
            result = conn.execute(text("SELECT 1"))
            row = result.fetchone()

            logger.info("데이터베이스 연결 성공!")

            return True
    except Exception as e:
        logger.error(f"데이터베이스 연결 실패: {str(e)}")
        logger.error(f"사용된 연결 URL 패턴: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
        logger.warning(
            f"데이터베이스 설정을 확인하세요: {settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}"
        )
        return False


# 주의: 초기 DB 연결 테스트는 main.py에서 한 번만 수행합니다.
# 여기서는 별도로 초기화하지 않고 함수만 제공합니다.


# FastAPI의 Depends와 함께 사용하기 위한 의존성 함수
def get_db() -> Generator[Session, None, None]:
    """
    데이터베이스 세션 의존성 함수
    세션을 자동으로 닫고 예외 발생 시 롤백 처리
    """
    import uuid

    # 각 세션 요청에 고유 ID 부여하여 추적
    session_id = str(uuid.uuid4())[:8]
    logger.info(f"DB 세션 시작 [세션ID: {session_id}]")

    db = SessionLocal()
    try:
        logger.info(f"DB 세션 생성 완료 [세션ID: {session_id}]")
        yield db
        db.commit()
        logger.info(f"DB 트랜잭션 커밋 완료 [세션ID: {session_id}]")
    except Exception as e:
        db.rollback()
        logger.error(f"DB 트랜잭션 롤백: {str(e)} [세션ID: {session_id}]")
        # 오류 세부 정보 기록
        import traceback

        logger.error(
            f"DB 오류 상세 내용: {traceback.format_exc()} [세션ID: {session_id}]"
        )
        raise
    finally:
        db.close()
        logger.info(f"DB 세션 종료 [세션ID: {session_id}]")


# 트랜잭션 관리 데코레이터
def db_transaction(func):
    """
    API 엔드포인트 함수에 적용하여 DB 트랜잭션을 자동으로 관리하는 데코레이터.
    함수 실행 성공 시 커밋, 예외 발생 시 롤백.
    `db: Session = Depends(get_db)` 파라미터를 함수 시그니처에 포함해야 함.
    """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        # 함수 인자에서 db 세션 찾기
        db = kwargs.get("db")
        if not db:
            # Depends로 주입되지 않은 경우 예외 발생
            raise ValueError(
                "db_transaction 데코레이터는 'db: Session = Depends(get_db)' 인자가 필요합니다."
            )

        try:
            result = await func(*args, **kwargs)
            db.commit()  # 명시적 커밋
            logger.debug(f"DB 트랜잭션 커밋 (데코레이터): 함수 {func.__name__}")
            return result
        except Exception as e:
            db.rollback()  # 명시적 롤백
            logger.error(
                f"DB 트랜잭션 롤백 (데코레이터): 함수 {func.__name__}, 오류: {str(e)}",
                exc_info=True,
            )
            # 원래 예외를 다시 발생시켜 FastAPI 에러 핸들러가 처리하도록 함
            raise e
        # finally 블록은 get_db() 에서 세션 close를 처리하므로 여기서는 불필요

    return wrapper
