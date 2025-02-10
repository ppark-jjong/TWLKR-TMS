"""에러 처리 유틸리티"""

from functools import wraps
from typing import Callable, Type, Union, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from app.utils.logger_util import Logger


class ServiceError(Exception):
    """서비스 레이어 기본 에러"""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def handle_service_error(
    error_map: dict = None,
    default_status: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
):
    """서비스 에러 처리 데코레이터

    Args:
        error_map (dict): 예외 클래스와 상태 코드 매핑
        default_status (int): 기본 HTTP 상태 코드

    Example:
        @handle_service_error({
            ValueError: 400,
            NotFoundError: 404
        })
        async def some_service_function():
            ...
    """
    error_map = error_map or {}

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except ServiceError as e:
                Logger.warning(f"서비스 에러 발생: {str(e)}")
                raise HTTPException(
                    status_code=e.status_code,
                    detail=e.message,
                )
            except SQLAlchemyError as e:
                Logger.error(f"데이터베이스 에러 발생: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="데이터베이스 처리 중 오류가 발생했습니다.",
                )
            except Exception as e:
                error_class = e.__class__
                status_code = error_map.get(error_class, default_status)

                if status_code >= 500:
                    Logger.error(f"서버 에러 발생: {str(e)}")
                else:
                    Logger.warning(f"클라이언트 에러 발생: {str(e)}")

                raise HTTPException(
                    status_code=status_code,
                    detail=str(e),
                )

        return wrapper

    return decorator


class NotFoundError(ServiceError):
    """리소스를 찾을 수 없음"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class ValidationError(ServiceError):
    """유효성 검증 실패"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_400_BAD_REQUEST)


class UnauthorizedError(ServiceError):
    """인증 실패"""

    def __init__(self, message: str = "인증이 필요합니다."):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(ServiceError):
    """권한 없음"""

    def __init__(self, message: str = "접근 권한이 없습니다."):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class ConflictError(ServiceError):
    """리소스 충돌"""
    def __init__(self, message: str):
        super().__init__(message, status.HTTP_409_CONFLICT)


def validate_resource_exists(resource: Optional[Type], resource_id: int):
    """리소스 존재 여부 검증"""
    if not resource:
        raise NotFoundError(f"ID가 {resource_id}인 리소스를 찾을 수 없습니다.")


def validate_status_transition(old_status: str, new_status: str, allowed_transitions: dict):
    """상태 변경 유효성 검증"""
    if new_status not in allowed_transitions.get(old_status, []):
        raise ValidationError(f"'{old_status}' 상태에서 '{new_status}' 상태로 변경할 수 없습니다.")
