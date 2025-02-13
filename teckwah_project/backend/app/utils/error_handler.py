# backend/app/utils/error_handler.py
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.utils.logger import log_error


def handle_database_error(error: SQLAlchemyError, operation: str) -> None:
    """데이터베이스 에러 상세 처리"""
    if isinstance(error, IntegrityError):
        if "foreign key constraint" in str(error):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="참조하는 데이터가 존재하지 않습니다",
            )
        if "unique constraint" in str(error):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 존재하는 데이터입니다",
            )

    log_error(error, f"데이터베이스 오류 ({operation})")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="데이터베이스 처리 중 오류가 발생했습니다",
    )


def handle_validation_error(error: Exception) -> dict:
    """입력값 검증 에러 처리"""
    return {
        "success": False,
        "message": str(error),
        "detail": {
            "error_type": error.__class__.__name__,
            "validation_errors": (
                [
                    {"field": err["loc"][0], "message": err["msg"]}
                    for err in error.errors()
                ]
                if hasattr(error, "errors")
                else None
            ),
        },
    }
