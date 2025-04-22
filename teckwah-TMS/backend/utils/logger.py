"""
통합 로깅 시스템 (간소화)
"""

import logging
import os
import sys
from datetime import datetime

# 로그 레벨 설정
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# 로거 생성
logger = logging.getLogger("teckwah-tms")
logger.setLevel(getattr(logging, LOG_LEVEL))

# 처리기가 없으면 기본 처리기 추가
if not logger.handlers:
    # 콘솔 출력 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, LOG_LEVEL))

    # 로그 포맷 설정
    log_format = "%(asctime)s [%(levelname)s] %(message)s"
    formatter = logging.Formatter(log_format, datefmt="%Y-%m-%d %H:%M:%S")
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    # 개발 환경에서만 파일 로깅
    if os.environ.get("ENVIRONMENT") != "production":
        try:
            log_dir = "logs"
            os.makedirs(log_dir, exist_ok=True)
            log_file = f"{log_dir}/app_{datetime.now().strftime('%Y%m%d')}.log"

            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(getattr(logging, LOG_LEVEL))
            file_handler.setFormatter(formatter)

            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"파일 로깅 설정 중 오류 발생: {e}")

# 간편 API 추가
logger.api = lambda method, url, data=None: logger.info(f"API {method} {url}")
logger.db = lambda msg: logger.debug(f"DB: {msg}")
logger.auth = lambda msg: logger.info(f"AUTH: {msg}")
logger.lock = lambda msg: logger.info(f"LOCK: {msg}")
logger.response = lambda url, success=True: logger.info(
    f"RESPONSE {url}: {'성공' if success else '실패'}"
)
logger.service = lambda service, method, params=None: logger.info(
    f"SERVICE {service}.{method}"
)

# 불필요한 로깅 함수 제거 및 필수 함수 유지
