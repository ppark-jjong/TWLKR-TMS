# teckwah_project/main/server/utils/exceptions.py
from fastapi import HTTPException, status
from typing import Any, Dict, List, Optional, Union
from main.server.utils.constants import MESSAGES

class BaseApiException(Exception):
    """API 예외의 기본 클래스"""

    def __init__(self, detail: str = MESSAGES["ERROR"]["SERVER"]):
        self.detail = detail
        super().__init__(self.detail)


class ValidationException(HTTPException):
    """데이터 유효성 검증 예외"""

    def __init__(
        self,
        detail: Union[str, Dict[str, Any]] = "입력 데이터가 유효하지 않습니다",
    ):
        # detail이 문자열인 경우 딕셔너리로 변환
        if isinstance(detail, str):
            detail = {
                "success": False,
                "message": detail,
                "error_code": "VALIDATION_ERROR"
            }
            
        # error_code가 없으면 기본값 추가
        if isinstance(detail, dict) and "error_code" not in detail:
            detail["error_code"] = "VALIDATION_ERROR"
            
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class NotFoundException(HTTPException):
    """리소스를 찾을 수 없는 예외"""

    def __init__(
        self,
        detail: Union[str, Dict[str, Any]] = "요청한 리소스를 찾을 수 없습니다",
    ):
        # detail이 문자열인 경우 딕셔너리로 변환
        if isinstance(detail, str):
            detail = {
                "success": False,
                "message": detail,
                "error_code": "NOT_FOUND"
            }
            
        # error_code가 없으면 기본값 추가
        if isinstance(detail, dict) and "error_code" not in detail:
            detail["error_code"] = "NOT_FOUND"
            
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class PessimisticLockException(HTTPException):
    """비관적 락 관련 예외"""

    def __init__(
        self,
        detail: Union[str, Dict[str, Any]] = "리소스가 잠겨 있습니다",
        dashboard_id: Optional[int] = None,
        dashboard_ids: Optional[List[int]] = None,
    ):
        # detail이 문자열인 경우 딕셔너리로 변환
        if isinstance(detail, str):
            detail = {
                "success": False,
                "message": detail,
                "error_code": "RESOURCE_LOCKED"
            }
            
            # dashboard_id 또는 dashboard_ids가 있으면 추가
            if dashboard_id:
                detail["dashboard_id"] = dashboard_id
            if dashboard_ids:
                detail["dashboard_ids"] = dashboard_ids
        
        # error_code가 없으면 기본값 추가
        if isinstance(detail, dict) and "error_code" not in detail:
            detail["error_code"] = "RESOURCE_LOCKED"
            
        super().__init__(status_code=status.HTTP_423_LOCKED, detail=detail)


class UnauthorizedException(BaseApiException):
    """인증되지 않은 접근 예외"""

    def __init__(self, detail: str = MESSAGES["ERROR"]["UNAUTHORIZED"]):
        super().__init__(detail)


class InvalidStatusTransitionException(HTTPException):
    """상태 전이 유효성 검증 예외"""

    def __init__(
        self,
        detail: Union[str, Dict[str, Any]] = "유효하지 않은 상태 전이입니다",
        current_status: Optional[str] = None,
        target_status: Optional[str] = None,
    ):
        # detail이 문자열인 경우 딕셔너리로 변환
        if isinstance(detail, str):
            detail = {
                "success": False,
                "message": detail,
                "error_code": "INVALID_STATUS_TRANSITION"
            }
            
            # 상태 정보가 있으면 추가
            if current_status and target_status:
                detail["current_status"] = current_status
                detail["target_status"] = target_status
                
        # error_code가 없으면 기본값 추가
        if isinstance(detail, dict) and "error_code" not in detail:
            detail["error_code"] = "INVALID_STATUS_TRANSITION"
            
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class DashboardStatusLockedException(ValidationException):
    """완료/취소 등 수정 불가 상태의 대시보드 예외"""

    def __init__(self, status: str):
        super().__init__(
            detail=f"'{status}' 상태의 대시보드는 수정할 수 없습니다",
            error_fields={"status": status},
        )