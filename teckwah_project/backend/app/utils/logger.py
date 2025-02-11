# backend/app/utils/logger.py

import logging
import sys
from datetime import datetime
from typing import Any
from pathlib import Path
from app.config.settings import get_settings

settings = get_settings()

# 로그 디렉토리 생성
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# 로그 파일명 설정
current_time = datetime.now().strftime("%Y%m%d")
log_file = log_dir / f"app_{current_time}.log"

# 로거 설정
logger = logging.getLogger("delivery-system")
logger.setLevel(getattr(logging, settings.LOG_LEVEL))

# 파일 핸들러
file_handler = logging.FileHandler(log_file, encoding='utf-8')
file_handler.setLevel(getattr(logging, settings.LOG_LEVEL))

# 콘솔 핸들러
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(getattr(logging, settings.LOG_LEVEL))

# 포맷터 설정
formatter = logging.Formatter(
    '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)

def log_error(error: Exception, context: str = None, data: Any = None):
    """에러 로깅"""
    error_message = f"에러 발생 - {context if context else 'Unknown context'}"
    if data:
        error_message += f"\n데이터: {data}"
    error_message += f"\n에러 메시지: {str(error)}"
    logger.error(error_message, exc_info=True)

def log_info(message: str, data: Any = None):
    """정보 로깅"""
    log_message = message
    if data:
        log_message += f"\n데이터: {data}"
    logger.info(log_message)

def log_warning(message: str, data: Any = None):
    """경고 로깅"""
    log_message = message
    if data:
        log_message += f"\n데이터: {data}"
    logger.warning(log_message)