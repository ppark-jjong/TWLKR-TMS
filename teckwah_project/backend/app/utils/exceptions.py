# app/utils/exceptions.py
from datetime import datetime
from typing import Optional, Any, Dict


class BaseApiException(Exception):
    """API 예외의 기본 클래스"""

    def __init__(
        self,
        detail: str,
        status_code: int = 400,
        error_code: str = "BAD_REQUEST",
        error_fields: Optional[Dict[str, Any]] = None,
    ):
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code
        self.error_fields = error_fields
        super().__init__(self.detail)


class PessimisticLockException(BaseApiException):
    """비관적 락 충돌 예외"""

    def __init__(
        self,
        detail: str,
        locked_by: str,
        lock_type: str,
        dashboard_id: int,
        expires_at: Optional[datetime] = None,
    ):
        super().__init__(
            detail=detail,
            status_code=423,  # Locked
            error_code="RESOURCE_LOCKED",
            error_fields={
                "locked_by": locked_by,
                "lock_type": lock_type,
                "dashboard_id": dashboard_id,
                "expires_at": expires_at.isoformat() if expires_at else None,
            },
        )
        self.locked_by = locked_by
        self.lock_type = lock_type
        self.dashboard_id = dashboard_id
        self.expires_at = expires_at


class UnauthorizedException(BaseApiException):
    """인증 실패 예외"""

    def __init__(self, detail: str = "인증에 실패했습니다"):
        super().__init__(
            detail=detail,
            status_code=401,  # Unauthorized
            error_code="UNAUTHORIZED",
        )


class ForbiddenException(BaseApiException):
    """권한 부족 예외"""

    def __init__(self, detail: str = "권한이 없습니다"):
        super().__init__(
            detail=detail,
            status_code=403,  # Forbidden
            error_code="FORBIDDEN",
        )


class NotFoundException(BaseApiException):
    """리소스 없음 예외"""

    def __init__(self, detail: str = "요청한 리소스를 찾을 수 없습니다"):
        super().__init__(
            detail=detail,
            status_code=404,  # Not Found
            error_code="NOT_FOUND",
        )


class ValidationException(BaseApiException):
    """데이터 유효성 검증 실패 예외"""

    def __init__(
        self,
        detail: str = "데이터 유효성 검증에 실패했습니다",
        error_fields: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            detail=detail,
            status_code=422,  # Unprocessable Entity
            error_code="VALIDATION_ERROR",
            error_fields=error_fields,
        )


class ServerException(BaseApiException):
    """서버 내부 오류 예외"""

    def __init__(self, detail: str = "서버 내부 오류가 발생했습니다"):
        super().__init__(
            detail=detail,
            status_code=500,  # Internal Server Error
            error_code="SERVER_ERROR",
        )
