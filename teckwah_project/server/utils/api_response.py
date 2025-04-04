"""
API 응답 유틸리티 모듈
표준화된 API 응답 생성 함수와 클래스를 제공합니다.

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

from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Union, TypeVar, Generic, Annotated
from datetime import datetime
from server.utils.datetime import get_kst_now
from fastapi.responses import JSONResponse

T = TypeVar("T")

# Pydantic 모델을 활용한 API 응답 클래스
class ApiResponse(BaseModel):
    """API 응답을 위한 Pydantic 모델
    
    이 클래스는 FastAPI 라우터에서 직접 반환 가능합니다.
    """
    success: bool
    message: str
    data: Optional[Any] = None
    error_code: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
    
    def __init__(self, **data):
        # timestamp가 없으면 현재 시간을 자동으로 설정
        if "timestamp" not in data:
            data["timestamp"] = get_kst_now().isoformat()
        super().__init__(**data)
    
    def to_response(self, status_code: int = 200) -> JSONResponse:
        """FastAPI JSONResponse 객체로 변환
        
        Args:
            status_code: HTTP 상태 코드
            
        Returns:
            JSONResponse 객체
        """
        return JSONResponse(
            content=self.dict(exclude_none=True),
            status_code=status_code
        )

    @classmethod
    def success(cls, message: str = "요청이 성공적으로 처리되었습니다", data: Optional[Any] = None, meta: Optional[Dict[str, Any]] = None) -> 'ApiResponse':
        """성공 응답 생성
        
        Args:
            message: 사용자에게 표시할 메시지
            data: 응답 데이터 (선택 사항)
            meta: 추가 메타데이터 (선택 사항)
            
        Returns:
            ApiResponse 객체
        """
        return cls(success=True, message=message, data=data, meta=meta)
    
    @classmethod
    def error(cls, message: str, error_code: str, data: Optional[Any] = None, meta: Optional[Dict[str, Any]] = None) -> 'ApiResponse':
        """오류 응답 생성
        
        Args:
            message: 사용자에게 표시할 오류 메시지
            error_code: 오류 코드
            data: 추가 오류 데이터 (선택 사항)
            meta: 추가 메타데이터 (선택 사항)
            
        Returns:
            ApiResponse 객체
        """
        return cls(success=False, message=message, error_code=error_code, data=data, meta=meta)
    
    @classmethod
    def paginated(cls, data: List[Any], total: int, page: int, size: int, message: str = "데이터를 성공적으로 조회했습니다", additional_meta: Optional[Dict[str, Any]] = None) -> 'ApiResponse':
        """페이지네이션된 응답 생성
        
        Args:
            data: 페이지네이션된 데이터 목록
            total: 전체 항목 수
            page: 현재 페이지 (1부터 시작)
            size: 페이지 크기
            message: 사용자에게 표시할 메시지
            additional_meta: 추가 메타데이터 (선택 사항)
            
        Returns:
            ApiResponse 객체
        """
        # 0으로 나누기 방지
        if size <= 0:
            size = 1
            
        total_pages = (total + size - 1) // size
        
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
            for key, value in additional_meta.items():
                if key != "pagination":  # pagination은 이미 설정됨
                    meta[key] = value
        
        return cls.success(message=message, data=data, meta=meta)

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
        
    if error_code is not None and not success:
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
    # 0으로 나누기 방지
    if size <= 0:
        size = 1
        
    total_pages = (total + size - 1) // size
    
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
        for key, value in additional_meta.items():
            if key != "pagination":  # pagination은 이미 설정됨
                meta[key] = value
    
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


def create_db_error_response(
    error_type: str = "DB_CONNECTION",
    message: str = "데이터베이스 오류가 발생했습니다"
) -> Dict[str, Any]:
    """데이터베이스 오류 응답 생성
    
    Args:
        error_type: 오류 유형 코드
        message: 오류 메시지
        
    Returns:
        데이터베이스 오류 응답
    """
    return create_error_response(error_type, message)


def create_operation_result_response(
    success: bool,
    affected_count: int,
    operation_type: str = "처리",
    item_name: str = "항목"
) -> Dict[str, Any]:
    """작업 결과 응답 생성
    
    Args:
        success: 작업 성공 여부
        affected_count: 영향받은 항목 수
        operation_type: 작업 유형 (예: "삭제", "수정")
        item_name: 항목 이름 (예: "대시보드", "주문")
        
    Returns:
        작업 결과 응답
    """
    if success:
        message = f"{affected_count}개 {item_name}을(를) {operation_type}했습니다"
        return create_success_response(affected_count, message)
    else:
        message = f"{item_name} {operation_type}에 실패했습니다"
        return create_error_response("OPERATION_FAILED", message)
