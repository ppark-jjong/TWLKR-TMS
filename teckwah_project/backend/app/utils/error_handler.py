# backend/app/utils/error_handler.py
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from app.utils.logger import log_error

def handle_database_error(error: SQLAlchemyError, operation: str) -> None:
    """데이터베이스 에러 간소화된 처리"""
    log_error(error, f"데이터베이스 오류 ({operation})")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail={"success": False, "message": "서버 오류가 발생했습니다"}
    )

def handle_validation_error(error: Exception) -> dict:
    """입력값 검증 에러 간소화된 처리"""
    return {
        "success": False,
        "message": "요청 데이터가 올바르지 않습니다",
    }