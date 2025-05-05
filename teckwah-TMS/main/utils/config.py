"""
설정 파일 - 간소화된 환경 변수 및 애플리케이션 설정 관리
"""

import os
import time
from typing import List, Dict, Any
from functools import lru_cache
import logging

# 로깅 설정
logger = logging.getLogger(__name__)

# 시스템 전체 타임존을 Asia/Seoul로 설정
os.environ["TZ"] = "Asia/Seoul"
try:
    time.tzset()  # 타임존 적용
except AttributeError:
    # Windows 환경에서는 tzset()이 지원되지 않음
    pass

# .env 파일 로드는 선택적으로 수행
# 환경 변수가 이미 설정되어 있다면 .env 파일은 무시됨
try:
    from dotenv import load_dotenv

    # 환경 변수 로드 - Docker와 로컬 환경 모두 확인
    env_paths = [
        "/app/.env",  # Docker 컨테이너 내부 경로
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
        ),  # 프로젝트 루트
        ".env",  # 현재 디렉토리
    ]

    env_loaded = False
    for env_path in env_paths:
        if os.path.exists(env_path):
            # override=False: 이미 설정된 환경 변수는 덮어쓰지 않음
            load_dotenv(env_path, override=False)
            logger.info(f".env 파일을 로드했습니다 (보조): {env_path}")
            env_loaded = True
            break

    if not env_loaded:
        logger.info(
            ".env 파일이 없습니다. 시스템 환경 변수만 사용합니다."
        )

except ImportError:
    logger.info(
        "python-dotenv 패키지가 설치되지 않았습니다. 시스템 환경 변수만 사용합니다."
    )


def parse_comma_separated_list(value: str) -> List[str]:
    """콤마로 구분된 문자열을 리스트로 변환"""
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    """애플리케이션 설정 - pydantic을 사용하지 않는 간소화된 설정 클래스"""

    def __init__(self):
        # 서버 설정
        self.DEBUG = os.getenv("DEBUG", "False").lower() == "true"
        self.PORT = int(os.getenv("PORT", "8080"))
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")  # 로그 레벨 설정 추가

        # 콤마로 구분된 문자열을 리스트로 변환
        origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:8080")
        self.ALLOWED_ORIGINS = parse_comma_separated_list(origins_env)

        # 데이터베이스 설정
        self.MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
        self.MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
        self.MYSQL_USER = os.getenv("MYSQL_USER", "root")
        self.MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "1234")
        self.MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "delivery_system")
        self.MYSQL_CHARSET = os.getenv("MYSQL_CHARSET", "utf8mb4")

        # 인증 설정
        self.SESSION_SECRET = os.getenv(
            "SESSION_SECRET",
            "4a24ff058be1925b52a62b9d594b367a600dde8730e647d2d29c9b2f7c7f6fff",
        )
        self.SESSION_EXPIRE_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))

        # 락 관련 설정 (5분 = 300초)
        self.LOCK_TIMEOUT_SECONDS = int(os.getenv("LOCK_TIMEOUT_SECONDS", "300"))
        self.LOCK_CLEANUP_INTERVAL_MINUTES = int(
            os.getenv("LOCK_CLEANUP_INTERVAL_MINUTES", "10")
        )
        
        # GAE 환경 확인
        self.GAE_ENV = os.getenv("GAE_ENV", "")

        # 설정 로드 로그
        logger.info("=== 애플리케이션 설정 로드 ===")
        logger.info(f"DEBUG: {self.DEBUG}")
        logger.info(f"PORT: {self.PORT}")
        logger.info(f"ALLOWED_ORIGINS: {self.ALLOWED_ORIGINS}")
        logger.info(f"MYSQL_HOST: {self.MYSQL_HOST}")
        logger.info(f"MYSQL_DATABASE: {self.MYSQL_DATABASE}")
        logger.info(f"GAE_ENV: {self.GAE_ENV}")
        logger.info(f"환경변수 SESSION_SECRET 설정: {'YES' if os.getenv('SESSION_SECRET') else 'NO (기본값 사용)'}")
        logger.info("=============================")

    # 로그 경로 설정 - Docker와 로컬 환경 모두 고려
    @property
    def LOG_DIR(self) -> str:
        if os.path.exists("/app"):
            return "/app/backend/logs"
        return os.path.join(os.path.dirname(__file__), "logs")

    # DB 연결 문자열
    @property
    def DATABASE_URL(self) -> str:
        # GAE 환경에서는 Private IP 사용 (포트 번호가 환경변수에 없을 수 있음)
        if self.GAE_ENV.startswith('standard'):
            # GAE 프로덕션 환경에서는 Private IP 직접 연결
            logger.info("GAE 프로덕션 환경 감지 - Private IP 연결 사용")
            return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}/{self.MYSQL_DATABASE}?charset={self.MYSQL_CHARSET}"
        else:
            # 로컬 개발 환경
            logger.info("로컬/개발 환경 - 포트 포함 연결 사용")
            return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset={self.MYSQL_CHARSET}"


@lru_cache()
def get_settings() -> Settings:
    """
    설정 객체 싱글톤 반환 (캐싱 적용)
    """
    return Settings()
