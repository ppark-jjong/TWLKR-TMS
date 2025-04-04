# teckwah_project/server/config/settings.py
from pydantic_settings import BaseSettings
from typing import Optional, List
from dotenv import load_dotenv
import os
from pathlib import Path
import logging

# 환경 변수 파일 로드 - 여러 경로에서 검색
env_paths = [
    "/app/.env",            # Docker 컨테이너 내부 경로
    "../deploy/.env.local", # 프로젝트 루트 기준 deploy 디렉토리
    ".env.local",           # 현재 디렉토리
    ".env",                 # 기본 파일명
]

env_loaded = False
for env_path in env_paths:
    env_file = Path(env_path)
    if env_file.exists():
        load_dotenv(env_file)
        logging.info(f"환경 변수 파일 로드 성공: {env_path}")
        env_loaded = True
        break

if not env_loaded:
    logging.warning("환경 변수 파일을 찾을 수 없습니다. 기본값을 사용합니다.")
    logging.info(f"검색한 경로: {', '.join(env_paths)}")


class Settings(BaseSettings):
    # 데이터베이스 설정
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "host.docker.internal")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "1234")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "delivery_system")
    MYSQL_CHARSET: str = os.getenv("MYSQL_CHARSET", "utf8mb4")

    # API 및 서비스 설정
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t", "yes")
    API_PREFIX: str = os.getenv("API_PREFIX", "")
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "배송 실시간 관제 시스템")

    # API 기본 URL 설정
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://0.0.0.0:8000")
    
    # CORS 설정 - 환경별로 분리
    CORS_ORIGINS: List[str] = []
    
    # 환경 변수에서 쉼표로 구분된 출처 목록 읽기
    origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if origins_env:
        CORS_ORIGINS = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
    
    # 기본 출처 설정 (환경 변수가 없는 경우)
    if not CORS_ORIGINS:
        CORS_ORIGINS = [
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
            "http://0.0.0.0:8000",
        ]
        
    # 개발 모드에서만 모든 출처 허용 (와일드카드)
    if DEBUG and "*" not in CORS_ORIGINS:
        CORS_ORIGINS.append("*")

    # Dash 앱 설정
    DASH_PORT: int = int(os.getenv("DASH_PORT", "3000"))

    # API 타임아웃 설정
    API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", "10"))

    # 로깅 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    ENABLE_ACCESS_LOG: bool = os.getenv("ENABLE_ACCESS_LOG", "True").lower() in (
        "true",
        "1",
        "t",
        "yes",
    )

    # JWT 설정
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "default-secret-key-for-jwt-never-use-in-production"
    )
    JWT_REFRESH_SECRET_KEY: str = os.getenv(
        "JWT_REFRESH_SECRET_KEY", "default-refresh-key-for-jwt-never-use-in-production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # 락 관련 설정
    LOCK_TIMEOUT_SECONDS: int = int(os.getenv("LOCK_TIMEOUT_SECONDS", "300"))
    LOCK_CLEANUP_INTERVAL_MINUTES: int = int(
        os.getenv("LOCK_CLEANUP_INTERVAL_MINUTES", "10")
    )
    # 락 획득 시 대기 타임아웃 설정 (초 단위)
    LOCK_WAIT_TIMEOUT: int = int(os.getenv("LOCK_WAIT_TIMEOUT", "5"))
    
    # 데이터베이스 연결 풀 설정
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "5"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    
    # 페이지네이션 기본값
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "10"))
    MAX_PAGE_SIZE: int = int(os.getenv("MAX_PAGE_SIZE", "100"))

    class Config:
        env_file = ".env.local"
        case_sensitive = True


_settings = None


def get_settings() -> Settings:
    """싱글톤 패턴으로 설정 인스턴스 제공"""
    global _settings
    if _settings is None:
        _settings = Settings()
        
        # 개발 모드일 때 설정 정보 로깅
        if _settings.DEBUG:
            logging.info(f"현재 설정 - DEBUG: {_settings.DEBUG}")
            logging.info(f"현재 설정 - MYSQL_HOST: {_settings.MYSQL_HOST}")
            logging.info(f"현재 설정 - API_PORT: {_settings.API_PORT}")
    
    return _settings
