# teckwah_project/main/server/utils/logger.py
import logging
import json
from datetime import datetime
from typing import Any, Optional, Dict, Union
from contextvars import ContextVar
from main.server.utils.datetime import get_kst_now

logger = logging.getLogger("delivery-system")

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
    """정보 로깅 - 기본 컨텍스트 정보 추가"""
    _log(logger.info, message, data)


def log_error(
    error: Union[Exception, Any], message: str, data: Optional[Any] = None
) -> None:
    """에러 로깅 - 기본 컨텍스트 정보 추가"""
    if isinstance(error, Exception):
        message = f"{message}: {str(error)}"
    _log(logger.error, message, data)


def log_warning(message: str, data: Optional[Any] = None) -> None:
    """경고 로깅 - 기본 컨텍스트 정보 추가"""
    _log(logger.warning, message, data)


def log_debug(message: str, data: Optional[Any] = None) -> None:
    """디버그 로깅 - 기본 컨텍스트 정보 추가"""
    _log(logger.debug, message, data)


def _log(log_func, message: str, data: Optional[Any] = None) -> None:
    """내부 로깅 함수 - 공통 로깅 로직"""
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
