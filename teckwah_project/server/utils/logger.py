# teckwah_project/server/utils/logger.py
import logging
import json
import os
import traceback
from typing import Any, Optional, Union
from contextvars import ContextVar
from server.utils.datetime import get_kst_now

# 디버그 모드 확인
DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")

# 로거 설정
logger = logging.getLogger("delivery-system")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if DEBUG else logging.INFO)

# 요청별 고유 ID를 저장하기 위한 ContextVar
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def set_request_id(request_id: str = None) -> str:
    """현재 요청에 대한 고유 ID 설정"""
    import uuid

    request_id = request_id or str(uuid.uuid4())
    request_id_var.set(request_id)
    return request_id


def get_request_id() -> str:
    """현재 요청의 고유 ID 반환"""
    return request_id_var.get()


def log_info(message: str, data: Optional[Any] = None) -> None:
    """정보 로깅"""
    _log(logger.info, message, data)


def log_error(
    error_or_message: Union[Exception, str], message: Optional[str] = None, data: Optional[Any] = None
) -> None:
    """에러 로깅"""
    if isinstance(error_or_message, Exception):
        error = error_or_message
        error_message = message or str(error)
        error_message = f"{error_message}: {str(error)}"
        
        # 기본 오류 정보만 기록
        error_data = {"exception": str(error)}
        if DEBUG:
            # 디버그 모드에서만 스택 트레이스 추가
            error_data["traceback"] = traceback.format_exc()
            
        if data:
            if isinstance(data, dict):
                error_data.update(data)
            else:
                error_data["data"] = str(data)
                
        _log(logger.error, error_message, error_data)
    else:
        # error_or_message는 문자열로 처리
        _log(logger.error, error_or_message, data)


def log_warning(message: str, data: Optional[Any] = None) -> None:
    """경고 로깅"""
    _log(logger.warning, message, data)


def log_debug(message: str, data: Optional[Any] = None) -> None:
    """디버그 로깅"""
    _log(logger.debug, message, data)


def _log(log_func, message: str, data: Optional[Any] = None) -> None:
    """내부 로깅 함수"""
    now = get_kst_now()
    log_entry = {
        "timestamp": now.isoformat(),
        "message": message,
        "request_id": get_request_id(),
    }

    if data:
        try:
            if isinstance(data, (dict, list, tuple, set)):
                log_entry["data"] = data
            else:
                log_entry["data"] = str(data)
        except Exception:
            log_entry["data"] = "데이터 직렬화 실패"

    log_func(json.dumps(log_entry, ensure_ascii=False, default=str))
