"""
로깅 설정
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
import os
from datetime import datetime

from app.config import get_settings

settings = get_settings()

def setup_logger():
    """애플리케이션 로거 설정"""
    # 로그 디렉토리 생성
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    # 로그 파일명 설정 (일별)
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(log_dir, f"{today}.log")
    
    # 루트 로거 설정
    logger = logging.getLogger()
    logger.setLevel(logging.INFO if settings.DEBUG else logging.WARNING)
    
    # 핸들러가 이미 설정되어 있는지 확인 (중복 방지)
    if not logger.handlers:
        # 콘솔 핸들러
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO if settings.DEBUG else logging.WARNING)
        console_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(console_format)
        logger.addHandler(console_handler)
        
        # 파일 핸들러 (최대 10MB, 백업 5개)
        file_handler = RotatingFileHandler(
            log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
        )
        file_handler.setLevel(logging.INFO)
        file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    
    return logger

# 로거 초기화
logger = setup_logger()
