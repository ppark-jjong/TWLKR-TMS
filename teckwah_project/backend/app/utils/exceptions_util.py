from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class BaseAPIException(Exception):
    """기본 API 예외 클래스"""

    def __init__(
        self,
        message: str,
        code: str = "UNKNOWN_ERROR",
        status_code: int = 500,
        data: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.data = data or {}
        super().__init__(message)


class AuthenticationError(BaseAPIException):
    """인증 관련 예외"""

    def __init__(
        self,
        message: str = "인증에 실패했습니다.",
        data: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message, code="AUTHENTICATION_ERROR", status_code=401, data=data
        )


class AuthorizationError(BaseAPIException):
    """권한 관련 예외"""

    def __init__(
        self, message: str = "권한이 없습니다.", data: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message, code="AUTHORIZATION_ERROR", status_code=403, data=data
        )


class ValidationError(HTTPException):
    def __init__(self, detail: str = "유효하지 않은 데이터입니다"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class NotFoundError(BaseAPIException):
    """리소스를 찾을 수 없는 예외"""

    def __init__(
        self,
        message: str = "리소스를 찾을 수 없습니다.",
        data: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message, code="NOT_FOUND_ERROR", status_code=404, data=data
        )


class DatabaseError(BaseAPIException):
    """데이터베이스 관련 예외"""

    def __init__(
        self,
        message: str = "데이터베이스 오류가 발생했습니다.",
        data: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message, code="DATABASE_ERROR", status_code=500, data=data
        )


class NotFoundException(HTTPException):
    def __init__(self, detail: str = "요청한 리소스를 찾을 수 없습니다"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
