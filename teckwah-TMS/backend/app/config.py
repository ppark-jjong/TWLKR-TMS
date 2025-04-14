"""
설정 파일 - 환경 변수 및 애플리케이션 설정 관리
"""
import os
from pydantic import BaseSettings
from typing import List, Optional
from functools import lru_cache

class Settings(BaseSettings):
    # 서버 설정
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    PORT: int = int(os.getenv("PORT", "8080"))
    ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS", "http://localhost:8080").split(",")
    
    # 데이터베이스 설정
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "host.docker.internal")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "1234")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "delivery_system")
    MYSQL_CHARSET: str = os.getenv("MYSQL_CHARSET", "utf8mb4")
    
    # 인증 설정
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "4a24ff058be1925b52a62b9d594b367a600dde8730e647d2d29c9b2f7c7f6fff")
    SESSION_EXPIRE_HOURS: int = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))
    
    # 락 관련 설정
    LOCK_TIMEOUT_SECONDS: int = int(os.getenv("LOCK_TIMEOUT_SECONDS", "300"))
    LOCK_CLEANUP_INTERVAL_MINUTES: int = int(os.getenv("LOCK_CLEANUP_INTERVAL_MINUTES", "10"))

    # DB 연결 문자열
    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset={self.MYSQL_CHARSET}"

@lru_cache()
def get_settings() -> Settings:
    """
    설정 객체 싱글톤 반환 (캐싱 적용)
    """
    return Settings()
