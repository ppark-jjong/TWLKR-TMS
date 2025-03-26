# teckwah_project/main/server/config/settings.py
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseSettings):
    # 데이터베이스 설정
    MYSQL_HOST: str = os.getenv("MYSQL_HOST")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE")
    MYSQL_CHARSET: str = os.getenv("MYSQL_CHARSET")

    # JWT 설정
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
    JWT_REFRESH_SECRET_KEY: str = os.getenv("JWT_REFRESH_SECRET_KEY")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # 서버 설정
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    API_PREFIX: str = os.getenv("API_PREFIX", "")
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "배송 실시간 관제 시스템")

    # 로깅 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    ENABLE_ACCESS_LOG: bool = os.getenv("ENABLE_ACCESS_LOG", "False").lower() == "true"

    # 락 관련 설정
    LOCK_TIMEOUT_SECONDS: int = int(os.getenv("LOCK_TIMEOUT_SECONDS", "300"))  # 기본값: 5분
    LOCK_CLEANUP_INTERVAL_MINUTES: int = int(os.getenv("LOCK_CLEANUP_INTERVAL_MINUTES", "10"))  # 기본값: 10분

    class Config:
        env_file = ".env.local"
        case_sensitive = True


_settings = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings