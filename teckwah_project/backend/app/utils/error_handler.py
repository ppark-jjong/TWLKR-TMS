# backend/app/utils/error_handler.py
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from app.utils.logger import log_error


class AuthError(Exception):
    pass


class ValidationError(Exception):
    pass


def handle_auth_error(error: Exception, operation: str) -> None:
    """인증 관련 에러 처리"""
    log_error(error, f"인증 오류: {operation}")
    if isinstance(error, AuthError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="인증 처리 중 오류가 발생했습니다",
    )


def handle_database_error(error: SQLAlchemyError, operation: str) -> None:
    """데이터베이스 에러 처리"""
    log_error(error, f"DB 오류: {operation}")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="데이터베이스 처리 중 오류가 발생했습니다",
    )


def create_error_response(error: Exception) -> dict:
    """에러 응답 생성"""
    return {
        "success": False,
        "message": str(error),
        "error_type": error.__class__.__name__,
    }
