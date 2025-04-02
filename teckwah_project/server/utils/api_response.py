"""
API 응답 유틸리티 모듈
표준화된 API 응답 생성 함수들을 제공합니다.
"""

from typing import Any, Dict, List, Optional, Union
from server.utils.datetime import get_kst_now


def create_response(
    success: bool, 
    message: str, 
    data: Optional[Any] = None, 
    error_code: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """표준화된 API 응답 생성"""
    response = {
        "success": success,
        "message": message,
        "timestamp": get_kst_now().isoformat()
    }
    
    if data is not None:
        response["data"] = data
        
    if error_code is not None:
        response["error_code"] = error_code
        
    if meta is not None:
        response["meta"] = meta
        
    return response


def create_success_response(
    data: Optional[Any] = None, 
    message: str = "요청이 성공적으로 처리되었습니다",
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """성공 응답 생성"""
    return create_response(True, message, data, meta=meta)


def create_error_response(
    error_code: str,
    message: str,
    data: Optional[Any] = None
) -> Dict[str, Any]:
    """오류 응답 생성"""
    return create_response(False, message, data, error_code)


def create_paginated_response(
    data: List[Any],
    total: int,
    page: int,
    size: int,
    message: str = "데이터를 성공적으로 조회했습니다"
) -> Dict[str, Any]:
    """페이지네이션된 응답 생성"""
    total_pages = (total + size - 1) // size if size > 0 else 0
    
    meta = {
        "pagination": {
            "total": total,
            "page": page,
            "size": size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }
    
    return create_success_response(data, message, meta)


def create_not_found_response(resource_type: str, resource_id: Optional[Union[int, str]] = None) -> Dict[str, Any]:
    """리소스가 없는 경우의 응답 생성"""
    if resource_id is not None:
        message = f"{resource_type}(ID: {resource_id})를 찾을 수 없습니다"
    else:
        message = f"{resource_type}을(를) 찾을 수 없습니다"
        
    return create_error_response("NOT_FOUND", message)


def create_validation_error_response(message: str, details: Optional[Dict[str, List[str]]] = None) -> Dict[str, Any]:
    """유효성 검증 오류 응답 생성"""
    response = create_error_response("VALIDATION_ERROR", message)
    
    if details:
        response["details"] = details
        
    return response


def create_lock_conflict_response(message: str = "다른 사용자가 현재 작업 중입니다", lock_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """락 충돌 응답 생성"""
    response = create_error_response("LOCK_CONFLICT", message)
    
    if lock_info:
        response["data"] = lock_info
        
    return response 