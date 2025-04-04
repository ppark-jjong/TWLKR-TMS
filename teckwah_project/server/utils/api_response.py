"""
API 응답 유틸리티 모듈
표준화된 API 응답 생성 함수들을 제공합니다.

응답 구조: 
{
    "success": boolean,
    "message": string,
    "data": any (optional),
    "error_code": string (optional, 오류 시에만),
    "meta": object (optional),
    "timestamp": string (ISO 형식)
}
"""

from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from server.utils.datetime import get_kst_now


def create_response(
    success: bool, 
    message: str, 
    data: Optional[Any] = None, 
    error_code: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """표준화된 API 응답 생성
    
    Args:
        success: 요청 성공 여부
        message: 사용자에게 표시할 메시지
        data: 응답 데이터 (선택 사항)
        error_code: 오류 코드 (실패 시, 선택 사항)
        meta: 추가 메타데이터 (선택 사항)
        
    Returns:
        표준화된 응답 딕셔너리
    """
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
    """성공 응답 생성
    
    Args:
        data: 응답 데이터 (선택 사항)
        message: 사용자에게 표시할 메시지
        meta: 추가 메타데이터 (선택 사항)
        
    Returns:
        성공 응답 딕셔너리
    """
    return create_response(True, message, data, meta=meta)


def create_error_response(
    error_code: str,
    message: str,
    data: Optional[Any] = None,
    meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """오류 응답 생성
    
    Args:
        error_code: 오류 코드
        message: 사용자에게 표시할 오류 메시지
        data: 추가 오류 데이터 (선택 사항)
        meta: 추가 메타데이터 (선택 사항)
        
    Returns:
        오류 응답 딕셔너리
    """
    return create_response(False, message, data, error_code, meta)


def create_paginated_response(
    data: List[Any],
    total: int,
    page: int,
    size: int,
    message: str = "데이터를 성공적으로 조회했습니다",
    additional_meta: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """페이지네이션된 응답 생성
    
    Args:
        data: 페이지네이션된 데이터 목록
        total: 전체 항목 수
        page: 현재 페이지 (1부터 시작)
        size: 페이지 크기
        message: 사용자에게 표시할 메시지
        additional_meta: 추가 메타데이터 (선택 사항)
        
    Returns:
        페이지네이션 정보가 포함된 성공 응답 딕셔너리
    """
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
    
    # 추가 메타데이터가 있으면 병합
    if additional_meta:
        meta.update(additional_meta)
    
    return create_success_response(data, message, meta)


def create_resource_not_found_response(resource_type: str, resource_id: Optional[Any] = None) -> Dict[str, Any]:
    """리소스를 찾을 수 없는 경우의 응답 생성
    
    Args:
        resource_type: 리소스 유형 (예: '대시보드', '사용자')
        resource_id: 리소스 식별자 (선택 사항)
        
    Returns:
        리소스 없음 오류 응답
    """
    if resource_id is not None:
        message = f"{resource_type}(ID: {resource_id})를 찾을 수 없습니다"
    else:
        message = f"{resource_type}을(를) 찾을 수 없습니다"
        
    return create_error_response("NOT_FOUND", message)


def create_validation_error_response(
    message: str, 
    details: Optional[Dict[str, List[str]]] = None
) -> Dict[str, Any]:
    """유효성 검증 오류 응답 생성
    
    Args:
        message: 오류 메시지
        details: 필드별 유효성 검증 오류 상세 정보 (선택 사항)
        
    Returns:
        유효성 검증 오류 응답
    """
    return create_error_response("VALIDATION_ERROR", message, details)


def create_lock_conflict_response(
    message: str = "다른 사용자가 현재 작업 중입니다", 
    lock_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """락 충돌 응답 생성
    
    Args:
        message: 오류 메시지
        lock_info: 락 충돌 정보 (선택 사항)
        
    Returns:
        락 충돌 오류 응답
    """
    return create_error_response("LOCK_CONFLICT", message, lock_info)
