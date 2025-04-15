"""
간단한 로깅 설정 - QA 테스트용
"""

import logging
import sys

def setup_logger():
    """간단한 QA 테스트용 로거 설정"""
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
    console_format = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # 루트 로거로 전파하지 않음 (중복 로깅 방지)
    logger.propagate = False
    
    return logger

# 로거 초기화 - 애플리케이션 전체에서 공유하는 단일 인스턴스
logger = setup_logger()
