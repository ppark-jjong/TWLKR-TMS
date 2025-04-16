"""
간결한 로깅 시스템 - QA 테스트와 이슈 추적을 위한 기본 설정
"""

import logging
import sys
from datetime import datetime

# 간단한 로깅 포맷
LOG_FORMAT = "%(asctime)s [%(levelname)s] [%(module)s] - %(message)s"

def setup_logger():
    """간단한 로깅 설정"""
    # 애플리케이션 로거 설정
    logger = logging.getLogger("teckwah-tms")
    logger.setLevel(logging.INFO)

    # 로거 핸들러 초기화 (중복 방지)
    if logger.handlers:
        for handler in logger.handlers:
            logger.removeHandler(handler)

    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(LOG_FORMAT)
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # 루트 로거로 전파하지 않음 (중복 로깅 방지)
    logger.propagate = False
    
    return logger

# 로거 초기화 - 애플리케이션 전체에서 공유하는 단일 인스턴스
_logger = setup_logger()

# 간단한 카테고리 접두사 함수
def api(message): 
    _logger.info(f"[API] {message}")

def db(message):
    _logger.info(f"[DB] {message}")

def auth(message):
    _logger.info(f"[AUTH] {message}")

def lock(message):
    _logger.info(f"[LOCK] {message}")

def info(message):
    _logger.info(message)

def warning(message):
    _logger.warning(message)

def error(message, exc=None):
    if exc:
        _logger.error(f"[ERROR] {message} - {str(exc)}")
    else:
        _logger.error(f"[ERROR] {message}")

def debug(message):
    _logger.debug(message)

# 외부에서 사용할 로거 객체 - 기존 코드와의 호환성 유지
class Logger:
    """로거 호환성 래퍼"""
    def api(self, message): api(message)
    def db(self, message): db(message)
    def auth(self, message): auth(message)
    def lock(self, message): lock(message)
    def info(self, message): info(message)
    def warning(self, message): warning(message)
    def error(self, message, error=None): error(message, error)
    def debug(self, message): debug(message)

logger = Logger()
