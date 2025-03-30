# server/utils/error.py  

import functools
from fastapi import HTTPException, status
from sqlalchemy.exc import (
    SQLAlchemyError, 
    IntegrityError,   # 무결성 제약 조건 위반
    OperationalError, # 데이터베이스 연결 및 기타 문제
    TimeoutError,     # 쿼리 타임아웃
)
from typing import Any, Dict, List, Optional, Union, Callable, TypeVar, cast
from pydantic import ValidationError

from server.utils.logger import log_info, log_error
from server.utils.datetime import get_kst_now

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

# 필수 기본 예외 클래스만 유지 (YAGNI 원칙)
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


class LockConflictException(BaseException):
    """락 충돌 발생시 예외"""

    def __init__(
        self,
        detail: str = "다른 사용자가 수정 중입니다",
        error_code: str = "LOCK_CONFLICT",
        lock_info: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            detail=detail, error_code=error_code, status_code=status.HTTP_409_CONFLICT
        )
        self.lock_info = lock_info


def format_error_response(error: BaseException) -> Dict[str, Any]:
    """표준화된 에러 응답 생성"""
    response = {
        "success": False,
        "error_code": getattr(error, "error_code", "SERVER_ERROR"),
        "message": error.detail,
        "timestamp": get_kst_now().isoformat(),
    }
    
    # 락 충돌인 경우 락 정보 추가
    if isinstance(error, LockConflictException) and error.lock_info:
        response["data"] = error.lock_info
        
    return response


def error_handler(operation_name: str) -> Callable:
    """에러 처리를 위한 데코레이터
    
    모든 API 응답을 일관된 형식으로 변환하고 예외를 적절히 처리합니다.
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                # 함수 시작 로깅
                log_info(f"{operation_name} 처리 시작")

                # 함수 실행
                result = await func(*args, **kwargs)

                # 함수 종료 로깅
                log_info(f"{operation_name} 처리 완료")

                # 응답에 타임스탬프 추가
                if hasattr(result, "model_dump") and callable(getattr(result, "model_dump")):
                    result_dict = result.model_dump()
                    if "timestamp" not in result_dict or result_dict["timestamp"] is None:
                        result.timestamp = get_kst_now().isoformat()

                return result
                
            except ValidationError as e:
                log_error(f"{operation_name} - 유효성 검증 실패: {str(e)}")
                return {
                    "success": False,
                    "error_code": "VALIDATION_ERROR",
                    "message": f"입력 데이터 유효성 검증 실패: {str(e)}",
                    "timestamp": get_kst_now().isoformat(),
                }
                
            except TimeoutError as e:
                log_error(f"{operation_name} - 데이터베이스 쿼리 타임아웃: {str(e)}")
                return {
                    "success": False,
                    "error_code": "QUERY_TIMEOUT",
                    "message": "데이터베이스 쿼리 시간이 초과되었습니다",
                    "timestamp": get_kst_now().isoformat(),
                }
                
            except IntegrityError as e:
                log_error(f"{operation_name} - 데이터 무결성 오류: {str(e)}")
                error_message = "데이터 무결성 제약 조건 위반입니다"
                if "unique" in str(e).lower():
                    error_message = "이미 존재하는 데이터입니다"
                elif "foreign key" in str(e).lower():
                    error_message = "참조하는 데이터가 존재하지 않습니다"
                    
                return {
                    "success": False,
                    "error_code": "INTEGRITY_ERROR",
                    "message": error_message,
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
                
            except LockConflictException as e:
                log_error(f"{operation_name} - 락 충돌 발생: {str(e)}")
                response = {
                    "success": False,
                    "error_code": "LOCK_CONFLICT",
                    "message": str(e),
                    "timestamp": get_kst_now().isoformat(),
                }
                # 락 정보가 있으면 추가
                if hasattr(e, "lock_info") and e.lock_info:
                    response["data"] = e.lock_info
                return response
                
            except BaseException as e:
                # 사용자 정의 예외 처리
                log_error(f"{operation_name} - 예외 발생: {str(e)}")
                return {
                    "success": False,
                    "error_code": getattr(e, "error_code", "SERVER_ERROR"),
                    "message": str(e),
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
                
            except Exception as e:
                # 예상치 못한 일반 예외 처리
                log_error(f"{operation_name} - 예상치 못한 오류: {str(e)}")
                return {
                    "success": False,
                    "error_code": "SERVER_ERROR",
                    "message": ERROR_MESSAGES["SERVER_ERROR"],
                    "timestamp": get_kst_now().isoformat(),
                }

        return cast(Callable[..., T], wrapper)

    return decorator