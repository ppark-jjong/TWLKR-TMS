# backend/app/config/settings.py
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseSettings):
    # 데이터베이스 설정
    MYSQL_HOST: str = os.getenv("MYSQL_HOST")
    MYSQL_PORT: int = os.getenv("MYSQL_PORT")
    MYSQL_USER: str = os.getenv("MYSQL_USER")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE")
    MYSQL_CHARSET: str = os.getenv("MYSQL_CHARSET")

    # JWT 설정
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
    JWT_REFRESH_SECRET_KEY: str = os.getenv("JWT_REFRESH_SECRET_KEY")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = os.getenv("REFRESH_TOKEN_EXPIRE_DAYS")

    # 서버 설정
    API_PORT: int = os.getenv("API_PORT")
    DEBUG: bool = os.getenv("DEBUG")
    API_PREFIX: str = os.getenv("API_PREFIX")
    PROJECT_NAME: str = os.getenv("PROJECT_NAME")

    # 로깅 설정
    LOG_LEVEL: str = os.getenv("LOG_LEVEL")
    ENABLE_ACCESS_LOG: bool = os.getenv("ENABLE_ACCESS_LOG")

    class Config:
        env_file = ".env.local"
        case_sensitive = True


_settings = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
