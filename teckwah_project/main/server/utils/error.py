# teckwah_project/main/server/utils/error.py
import functools
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from typing import Any, Dict, List, Optional, Union, Callable, TypeVar, cast
from pydantic import ValidationError

from main.server.utils.logger import log_info, log_error
from main.server.utils.datetime import get_kst_now

# 공통 메시지 상수
ERROR_MESSAGES = {
    "SERVER_ERROR": "서버 내부 오류가 발생했습니다",
    "NOT_FOUND": "요청한 리소스를 찾을 수 없습니다",
    "UNAUTHORIZED": "인증되지 않은 접근입니다",
    "FORBIDDEN": "권한이 없습니다",
    "BAD_REQUEST": "잘못된 요청입니다",
    "LOCK_CONFLICT": "다른 사용자가 작업 중입니다",
    "VALIDATION_ERROR": "입력 데이터가 유효하지 않습니다",
    "DB_ERROR": "데이터베이스 오류가 발생했습니다",
    "DB_CONNECTION": "데이터베이스 연결 오류가 발생했습니다",
}

T = TypeVar("T")


class BaseException(HTTPException):
    """기본 예외 클래스"""

    def __init__(
        self,
        detail: str,
        error_code: str = "BAD_REQUEST",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.error_code = error_code
        super().__init__(status_code=status_code, detail=detail)


class NotFoundException(BaseException):
    """리소스를 찾을 수 없을 때 발생하는 예외"""

    def __init__(self, detail: str, error_code: str = "NOT_FOUND"):
        super().__init__(
            detail=detail, error_code=error_code, status_code=status.HTTP_404_NOT_FOUND
        )


class UnauthorizedException(BaseException):
    """인증되지 않은 요청일 때 발생하는 예외"""

    def __init__(
        self, detail: str = "인증되지 않은 요청입니다", error_code: str = "UNAUTHORIZED"
    ):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenException(BaseException):
    """권한이 없는 요청일 때 발생하는 예외"""

    def __init__(
        self, detail: str = "접근 권한이 없습니다", error_code: str = "FORBIDDEN"
    ):
        super().__init__(
            detail=detail, error_code=error_code, status_code=status.HTTP_403_FORBIDDEN
        )


class ValidationException(BaseException):
    """데이터 검증 실패시 발생하는 예외"""

    def __init__(self, detail: str, error_code: str = "VALIDATION_ERROR"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )


class DatabaseException(BaseException):
    """데이터베이스 관련 예외"""

    def __init__(self, detail: str, error_code: str = "DB_ERROR"):
        super().__init__(
            detail=detail,
            error_code=error_code,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class LockConflictException(BaseException):
    """락 충돌 발생시 예외"""

    def __init__(
        self,
        detail: str = "다른 사용자가 수정 중입니다",
        error_code: str = "LOCK_CONFLICT",
    ):
        super().__init__(
            detail=detail, error_code=error_code, status_code=status.HTTP_409_CONFLICT
        )


def format_error_response(error: BaseException) -> Dict[str, Any]:
    """표준화된 에러 응답 생성"""
    return {
        "success": False,
        "error_code": getattr(error, "error_code", "SERVER_ERROR"),
        "message": error.detail,
        "timestamp": get_kst_now().isoformat(),
    }


def error_handler(operation_name: str) -> Callable:
    """에러 처리를 위한 데코레이터

    모든 API 응답을 일관된 형식으로 변환하고 예외를 적절히 처리합니다.
    {
        "success": false,
        "error_code": "ERROR_CODE",
        "message": "오류 메시지",
        "timestamp": "2023-01-01T00:00:00+09:00"
    }
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                # 함수 시작 시간 로깅
                start_time = get_kst_now()
                log_info(f"{operation_name} 처리 시작: {start_time.isoformat()}")

                result = await func(*args, **kwargs)

                # 함수 종료 시간 로깅
                end_time = get_kst_now()
                duration = (end_time - start_time).total_seconds()
                log_info(
                    f"{operation_name} 처리 완료: {end_time.isoformat()} (처리시간: {duration:.3f}초)"
                )

                # 타임스탬프 추가 (응답이 ApiResponse 형식인 경우)
                if hasattr(result, "model_dump") and callable(
                    getattr(result, "model_dump")
                ):
                    result_dict = result.model_dump()
                    if (
                        "timestamp" not in result_dict
                        or result_dict["timestamp"] is None
                    ):
                        result.timestamp = get_kst_now().isoformat()

                return result
            except ValidationError as e:
                log_error(f"{operation_name} - 유효성 검증 실패: {str(e)}")
                validation_exception = ValidationException(str(e))
                return {
                    "success": False,
                    "error_code": validation_exception.error_code,
                    "message": validation_exception.detail,
                    "timestamp": get_kst_now().isoformat(),
                }
            except IntegrityError as e:
                log_error(f"{operation_name} - 데이터 무결성 오류: {str(e)}")
                return {
                    "success": False,
                    "error_code": "INTEGRITY_ERROR",
                    "message": "데이터 무결성 제약 조건 위반입니다",
                    "timestamp": get_kst_now().isoformat(),
                }
            except OperationalError as e:
                log_error(f"{operation_name} - 데이터베이스 연결 오류: {str(e)}")
                return {
                    "success": False,
                    "error_code": "DB_CONNECTION",
                    "message": ERROR_MESSAGES["DB_CONNECTION"],
                    "timestamp": get_kst_now().isoformat(),
                }
            except SQLAlchemyError as e:
                log_error(f"{operation_name} - 데이터베이스 오류: {str(e)}")
                return {
                    "success": False,
                    "error_code": "DB_ERROR",
                    "message": ERROR_MESSAGES["DB_ERROR"],
                    "timestamp": get_kst_now().isoformat(),
                }
            except BaseException as e:
                log_error(f"{operation_name} - 예외 발생: {str(e)}")
                return format_error_response(e)
            except Exception as e:
                log_error(f"{operation_name} - 예상치 못한 오류: {str(e)}")
                return {
                    "success": False,
                    "error_code": "SERVER_ERROR",
                    "message": ERROR_MESSAGES["SERVER_ERROR"],
                    "timestamp": get_kst_now().isoformat(),
                }

        return cast(Callable[..., T], wrapper)

    return decorator
