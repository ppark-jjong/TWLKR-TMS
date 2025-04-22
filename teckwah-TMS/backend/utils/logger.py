"""
간소화된 로깅 시스템 - 핵심 실행 포인트 기록을 위한 설정
"""

import logging
import sys
from datetime import datetime

# 간단한 로깅 포맷
LOG_FORMAT = "%(asctime)s [%(levelname)s] [%(module)s] - %(message)s"


def setup_logger():
    """간소화된 로깅 설정"""
    # 애플리케이션 로거 설정
    logger = logging.getLogger("teckwah-tms")
    logger.setLevel(logging.DEBUG)  # 로거 기본 레벨을 DEBUG로 변경

    # 로거 핸들러 초기화 (중복 방지)
    if logger.handlers:
        for handler in logger.handlers:
            logger.removeHandler(handler)

    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)  # 콘솔 핸들러 레벨도 DEBUG로 변경
    console_format = logging.Formatter(LOG_FORMAT)
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)

    # 루트 로거로 전파하지 않음 (중복 로깅 방지)
    logger.propagate = False

    return logger


# 로거 초기화 - 애플리케이션 전체에서 공유하는 단일 인스턴스
_logger = setup_logger()


# 핵심 카테고리 로깅 함수 - 간소화된 버전
def api(message):
    """API 호출 및 응답 관련 핵심 로그"""
    _logger.info(f"[API] {message}")


def db(message):
    """데이터베이스 작업 관련 핵심 로그"""
    _logger.info(f"[DB] {message}")


def auth(message):
    """인증 작업 관련 핵심 로그"""
    _logger.info(f"[AUTH] {message}")


def error(message, exc=None):
    """오류 관련 로그"""
    if exc:
        _logger.error(f"[ERROR] {message} - {str(exc)}")
    else:
        _logger.error(f"[ERROR] {message}")


# 외부에서 사용할 로거 객체 - 기존 코드와의 호환성 유지
class Logger:
    """로거 호환성 래퍼 - 핵심 로깅 기능만 유지"""

    def api(self, message):
        """API 호출 및 응답 관련 핵심 로그"""
        api(message)

    def db(self, message):
        """데이터베이스 작업 관련 핵심 로그"""
        db(message)

    def auth(self, message):
        """인증 작업 관련 핵심 로그"""
        auth(message)

    def error(self, message, error=None, exc_info=False):
        """오류 관련 로그 (exc_info 추가)"""
        log_message = f"[ERROR] {message}"
        if error:
            log_message += f" - {str(error)}"
        _logger.error(log_message, exc_info=exc_info)

    def debug(self, message):
        _logger.debug(f"[DEBUG] {message}")

    def info(self, message):
        _logger.info(message)

    def warning(self, message):
        _logger.warning(f"[WARN] {message}")

    def lock(self, message):
        _logger.info(f"[LOCK] {message}")


logger = Logger()
