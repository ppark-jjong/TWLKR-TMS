# teckwah_project/main/server/utils/api_decorators.py
import functools
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError

from main.server.utils.logger import log_info, log_error
from main.server.utils.exceptions import (
    ValidationException,
    NotFoundException,
    PessimisticLockException,
    UnauthorizedException,
)
from main.server.utils.datetime_helper import get_kst_now
from main.server.utils.constants import MESSAGES


def error_handler(operation_name: str):
    """API 엔드포인트 에러 핸들링 데코레이터 (일관된 응답 구조)"""

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # 함수 시작 시간 로깅
                start_time = get_kst_now()
                log_info(f"{operation_name} 처리 시작: {start_time.isoformat()}")
                
                result = await func(*args, **kwargs)
                
                # 함수 종료 시간 로깅
                end_time = get_kst_now()
                duration = (end_time - start_time).total_seconds()
                log_info(f"{operation_name} 처리 완료: {end_time.isoformat()} (처리시간: {duration:.3f}초)")
                
                return result
            except Exception as e:
                # 모든 예외를 내부적으로 로깅
                log_error(e, f"{operation_name} 처리 중 오류 발생")

                # 기본 오류 정보
                error_message = MESSAGES["ERROR"]["SERVER"]
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                error_code = "SERVER_ERROR"

                # 예외 유형별 처리
                if isinstance(e, IntegrityError):
                    status_code = status.HTTP_409_CONFLICT
                    error_message = MESSAGES["ERROR"]["DB_ERROR"]
                    error_code = "INTEGRITY_ERROR"
                elif isinstance(e, OperationalError):
                    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                    error_message = MESSAGES["ERROR"]["DB_CONNECTION"]
                    error_code = "DB_CONNECTION_ERROR"
                elif isinstance(e, SQLAlchemyError):
                    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                    error_message = MESSAGES["ERROR"]["DB_ERROR"]
                    error_code = "DB_ERROR"
                elif isinstance(e, ValidationException):
                    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
                    error_message = str(e) or MESSAGES["ERROR"]["VALIDATION"]
                    error_code = "VALIDATION_ERROR"
                elif isinstance(e, NotFoundException):
                    status_code = status.HTTP_404_NOT_FOUND
                    error_message = str(e) or MESSAGES["ERROR"]["NOT_FOUND"]
                    error_code = "NOT_FOUND"
                elif isinstance(e, PessimisticLockException):
                    status_code = status.HTTP_423_LOCKED
                    error_message = str(e) or MESSAGES["ERROR"]["LOCKED"]
                    error_code = "RESOURCE_LOCKED"
                elif isinstance(e, UnauthorizedException):
                    status_code = status.HTTP_401_UNAUTHORIZED
                    error_message = str(e) or MESSAGES["ERROR"]["UNAUTHORIZED"]
                    error_code = "UNAUTHORIZED"
                elif isinstance(e, ValueError):
                    status_code = status.HTTP_400_BAD_REQUEST
                    error_message = str(e) or MESSAGES["ERROR"]["BAD_REQUEST"]
                    error_code = "INVALID_REQUEST"
                elif isinstance(e, HTTPException):
                    # FastAPI HTTP 예외는 그대로 전달
                    raise e
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
                        "timestamp": get_kst_now().isoformat(),
                    },
                )

        return wrapper

    return decorator