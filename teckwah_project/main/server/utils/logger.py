# teckwah_project/main/server/utils/logger.py
import logging
import json
import uuid
from contextvars import ContextVar
from datetime import datetime
from typing import Any, Optional, Dict, Union
import traceback
import inspect

logger = logging.getLogger("delivery-system")

# 요청별 고유 ID를 저장하기 위한 ContextVar
request_id_var: ContextVar[str] = ContextVar('request_id', default='')

def set_request_id() -> str:
    """
    현재 요청에 대한 고유 ID를 생성하고 설정
    
    Returns:
        str: 생성된 요청 ID
    """
    request_id = str(uuid.uuid4())
    request_id_var.set(request_id)
    return request_id

def get_request_id() -> str:
    """
    현재 요청의 고유 ID를 반환
    
    Returns:
        str: 현재 요청의 ID
    """
    return request_id_var.get()

def log_info(message: str, data: Optional[Any] = None, context: Optional[Dict[str, Any]] = None) -> None:
    """
    정보 로깅 - 컨텍스트 정보 추가
    
    Args:
        message: 로그 메시지
        data: 추가 데이터
        context: 컨텍스트 정보 (호출자, 함수명 등)
    """
    if context is None:
        # 호출자 정보 자동 수집
        frame = inspect.currentframe().f_back
        func_name = frame.f_code.co_name
        file_name = frame.f_code.co_filename.split('/')[-1]
        line_no = frame.f_lineno
        context = {
            "file": file_name,
            "function": func_name,
            "line": line_no
        }
    
    # 요청 ID 추가
    request_id = get_request_id()
    if request_id:
        context["request_id"] = request_id
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "message": message,
        "context": context
    }
    
    if data:
        try:
            # 데이터를 문자열로 포맷팅
            if isinstance(data, (dict, list, tuple, set)):
                log_entry["data"] = data
            else:
                log_entry["data"] = str(data)
        except Exception:
            log_entry["data"] = "데이터 직렬화 실패"
    
    logger.info(json.dumps(log_entry, ensure_ascii=False, default=str))


def log_error(
    error: Union[Exception, Any], 
    context: str, 
    data: Optional[Any] = None, 
    additional_context: Optional[Dict[str, Any]] = None
) -> None:
    """
    에러 로깅 - 스택 트레이스 및 추가 컨텍스트 정보 포함
    
    Args:
        error: 예외 객체 또는 에러 메시지
        context: 에러 발생 컨텍스트 설명
        data: 관련 데이터
        additional_context: 추가 컨텍스트 정보
    """
    # 호출자 정보 자동 수집
    frame = inspect.currentframe().f_back
    func_name = frame.f_code.co_name
    file_name = frame.f_code.co_filename.split('/')[-1]
    line_no = frame.f_lineno
    
    log_context = {
        "file": file_name,
        "function": func_name,
        "line": line_no
    }
    
    # 요청 ID 추가
    request_id = get_request_id()
    if request_id:
        log_context["request_id"] = request_id
    
    # 추가 컨텍스트 정보가 있으면 병합
    if additional_context:
        log_context.update(additional_context)
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "message": f"에러 발생 ({context}): {str(error) if error else 'None'}",
        "context": log_context
    }
    
    # 데이터 추가
    if data:
        try:
            log_entry["data"] = data if isinstance(data, (dict, list, tuple, set)) else str(data)
        except Exception:
            log_entry["data"] = "데이터 직렬화 실패"
    
    # 스택 트레이스 추가 (예외 객체인 경우)
    if isinstance(error, Exception):
        log_entry["stack_trace"] = traceback.format_exc()
    
    logger.error(json.dumps(log_entry, ensure_ascii=False, default=str))


def log_warning(
    message: str, 
    data: Optional[Any] = None, 
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    경고 로깅 - 컨텍스트 정보 추가
    
    Args:
        message: 경고 메시지
        data: 추가 데이터
        context: 컨텍스트 정보
    """
    if context is None:
        # 호출자 정보 자동 수집
        frame = inspect.currentframe().f_back
        func_name = frame.f_code.co_name
        file_name = frame.f_code.co_filename.split('/')[-1]
        line_no = frame.f_lineno
        context = {
            "file": file_name,
            "function": func_name,
            "line": line_no
        }
    
    # 요청 ID 추가
    request_id = get_request_id()
    if request_id:
        context["request_id"] = request_id
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "message": message,
        "context": context
    }
    
    if data:
        try:
            log_entry["data"] = data if isinstance(data, (dict, list, tuple, set)) else str(data)
        except Exception:
            log_entry["data"] = "데이터 직렬화 실패"
    
    logger.warning(json.dumps(log_entry, ensure_ascii=False, default=str))


def log_debug(
    message: str, 
    data: Optional[Any] = None, 
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    디버그 로깅 - 개발 및 디버깅 용도
    
    Args:
        message: 디버그 메시지
        data: 추가 데이터
        context: 컨텍스트 정보
    """
    if context is None:
        # 호출자 정보 자동 수집
        frame = inspect.currentframe().f_back
        func_name = frame.f_code.co_name
        file_name = frame.f_code.co_filename.split('/')[-1]
        line_no = frame.f_lineno
        context = {
            "file": file_name,
            "function": func_name,
            "line": line_no
        }
    
    # 요청 ID 추가
    request_id = get_request_id()
    if request_id:
        context["request_id"] = request_id
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "message": message,
        "context": context
    }
    
    if data:
        try:
            log_entry["data"] = data if isinstance(data, (dict, list, tuple, set)) else str(data)
        except Exception:
            log_entry["data"] = "데이터 직렬화 실패"
    
    logger.debug(json.dumps(log_entry, ensure_ascii=False, default=str))