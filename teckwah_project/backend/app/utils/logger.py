# backend/app/utils/logger.py
import logging
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger("delivery-system")


def log_info(message: str, data: Optional[Any] = None) -> None:
    """정보 로깅"""
    if data:
        logger.info(f"{message} - 데이터: {data}")
    else:
        logger.info(message)


def log_error(error: Exception, context: str, data: Optional[Any] = None) -> None:
    """에러 로깅"""
    error_message = f"에러 발생 ({context}): {str(error)}"
    if data:
        error_message += f"\n데이터: {data}"
    logger.error(error_message, exc_info=True)


def log_warning(message: str, data: Optional[Any] = None) -> None:
    """경고 로깅"""
    if data:
        logger.warning(f"{message} - 데이터: {data}")
    else:
        logger.warning(message)
