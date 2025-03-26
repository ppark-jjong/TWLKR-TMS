# teckwah_project/main/server/utils/api_decorators.py
import functools
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

from main.server.utils.logger import log_error
from main.server.utils.exceptions import (
    ValidationException,
    NotFoundException,
    PessimisticLockException,
    UnauthorizedException,
)


def error_handler(operation_name: str):
    """API 엔드포인트 에러 핸들링 데코레이터 (일관된 응답 구조)"""

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # 모든 예외를 내부적으로 로깅
                log_error(e, f"{operation_name} 처리 중 오류 발생")

                # 기본 오류 정보
                error_message = "요청을 처리할 수 없습니다"
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                error_code = "SERVER_ERROR"

                # 예외 유형별 처리
                if isinstance(e, IntegrityError):
                    status_code = status.HTTP_409_CONFLICT
                    error_message = "데이터 무결성 오류가 발생했습니다"
                    error_code = "INTEGRITY_ERROR"
                elif isinstance(e, OperationalError):
                    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                    error_message = "데이터베이스 연결 오류가 발생했습니다"
                    error_code = "DB_CONNECTION_ERROR"
                elif isinstance(e, SQLAlchemyError):
                    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                    error_message = "데이터베이스 오류가 발생했습니다"
                    error_code = "DB_ERROR"
                elif isinstance(e, ValidationException):
                    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
                    error_message = str(e) or "입력 데이터가 유효하지 않습니다"
                    error_code = "VALIDATION_ERROR"
                elif isinstance(e, NotFoundException):
                    status_code = status.HTTP_404_NOT_FOUND
                    error_message = str(e) or "요청한 리소스를 찾을 수 없습니다"
                    error_code = "NOT_FOUND"
                elif isinstance(e, PessimisticLockException):
                    status_code = status.HTTP_423_LOCKED
                    error_message = str(e) or "다른 사용자가 작업 중입니다"
                    error_code = "RESOURCE_LOCKED"
                elif isinstance(e, UnauthorizedException):
                    status_code = status.HTTP_401_UNAUTHORIZED
                    error_message = str(e) or "인증되지 않은 접근입니다"
                    error_code = "UNAUTHORIZED"
                elif isinstance(e, ValueError):
                    status_code = status.HTTP_400_BAD_REQUEST
                    error_message = str(e) or "잘못된 요청입니다"
                    error_code = "INVALID_REQUEST"
                elif hasattr(e, "detail"):
                    error_message = e.detail
                elif str(e):
                    error_message = str(e)

                # 일관된 오류 응답 형식 반환
                raise HTTPException(
                    status_code=status_code,
                    detail={
                        "success": False,
                        "message": error_message,
                        "error_code": error_code,
                    },
                )

        return wrapper

    return decorator
