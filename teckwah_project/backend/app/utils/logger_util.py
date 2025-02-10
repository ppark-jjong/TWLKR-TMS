import sys
from loguru import logger
from pathlib import Path
from typing import Any
import logging


class Logger:
    """로깅 유틸리티 클래스"""

    _instance = None
    _initialized = False

    def __new__(cls) -> Any:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if not Logger._initialized:
            self._setup_logger()
            Logger._initialized = True

    def _setup_logger(self) -> None:
        """로거 설정"""
        # 로그 파일 경로 설정
        log_path = Path("logs")
        log_path.mkdir(exist_ok=True)

        # 로그 포맷 설정
        log_format = (
            "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
            "<level>{message}</level>"
        )

        # 기본 로거 제거
        logger.remove()

        # 콘솔 로거 추가
        logger.add(sys.stdout, format=log_format, level="DEBUG", colorize=True)

        # 파일 로거 추가 (에러만)
        logger.add(
            log_path / "error.log",
            format=log_format,
            level="ERROR",
            rotation="1 day",
            retention="7 days",
        )

        # 파일 로거 추가 (전체)
        logger.add(
            log_path / "app.log",
            format=log_format,
            level="INFO",
            rotation="1 day",
            retention="7 days",
        )

    @staticmethod
    def info(message: str):
        logging.info(f"[INFO] {message}")

    @staticmethod
    def error(message: str):
        logging.error(f"[ERROR] {message}")

    @staticmethod
    def debug(message: str):
        logging.debug(f"[DEBUG] {message}")

    @staticmethod
    def warning(message: str):
        logging.warning(f"[WARNING] {message}")

    @classmethod
    def critical(cls, message: str) -> None:
        """치명적 에러 레벨 로그"""
        logger.critical(message)


# 싱글톤 인스턴스 생성
Logger()
