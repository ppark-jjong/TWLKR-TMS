from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # 데이터베이스 설정
    MYSQL_HOST: str = "mysql"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "1234"
    MYSQL_DATABASE: str = "delivery_system"

    # JWT 설정
    JWT_SECRET_KEY: str = (
        "4a24ff058be1925b52a62b9d594b367a600dde8730e647d2d29c9b2f7c7f6fff"
    )
    JWT_REFRESH_SECRET_KEY: str = (
        "8b24ff058be1925b52a62b9d594b367a600dde8730e647d2d29c9b2f7c7f6fff"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # 서버 설정
    API_PORT: int = 8000
    DEBUG: bool = True
    API_PREFIX: str = ""
    PROJECT_NAME: str = "배송 실시간 관제 시스템"

    # 로깅 설정
    LOG_LEVEL: str = "DEBUG"
    ENABLE_ACCESS_LOG: bool = True

    # 캐시 설정
    CACHE_EXPIRATION: int = 3600
    SESSION_TTL: int = 3600
    ENABLE_SESSION_LOGGING: bool = True

    class Config:
        env_file = ".env.local"
        case_sensitive = True


_settings = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
