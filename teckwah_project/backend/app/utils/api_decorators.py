# app/utils/api_decorators.py
import functools
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError

from app.utils.logger import log_error
from app.utils.exceptions import (
    BaseApiException,
    PessimisticLockException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
    ServerException,
)


def error_handler(operation_name: str):
    """API 엔드포인트 에러 핸들링 데코레이터

    모든 API 엔드포인트 함수에 적용하여 일관된 에러 처리 및 로깅 제공

    Args:
        operation_name: 로깅 시 표시할 작업 이름
    """

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except PessimisticLockException as e:
                # 락 충돌 예외 (423 Locked)
                log_error(
                    e,
                    f"{operation_name} - 락 충돌",
                    {
                        "locked_by": e.locked_by,
                        "lock_type": e.lock_type,
                        "dashboard_id": e.dashboard_id,
                    },
                )
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail={
                        "message": str(e.detail),
                        "locked_by": e.locked_by,
                        "lock_type": e.lock_type,
                    },
                )
            except ValidationError as e:
                # Pydantic 유효성 검증 실패 (422 Unprocessable Entity)
                log_error(e, f"{operation_name} - 데이터 유효성 검증 실패")
                error_fields = {}
                for error in e.errors():
                    field = ".".join(str(loc) for loc in error["loc"])
                    error_fields[field] = error["msg"]

                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "message": "입력 데이터가 유효하지 않습니다",
                        "errors": error_fields,
                    },
                )
            except ValueError as e:
                # 값 오류 (400 Bad Request)
                log_error(e, f"{operation_name} - 값 오류")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": str(e)},
                )
            except SQLAlchemyError as e:
                # 데이터베이스 오류 (500 Internal Server Error)
                log_error(e, f"{operation_name} - 데이터베이스 오류")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"message": "데이터베이스 오류가 발생했습니다"},
                )
            except BaseApiException as e:
                # 커스텀 API 예외
                log_error(e, f"{operation_name} - {e.error_code}")
                raise HTTPException(
                    status_code=e.status_code,
                    detail={
                        "message": e.detail,
                        "code": e.error_code,
                        "fields": e.error_fields,
                    },
                )
            except Exception as e:
                # 기타 예외 (500 Internal Server Error)
                log_error(e, f"{operation_name} - 알 수 없는 오류")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={"message": "서버 내부 오류가 발생했습니다"},
                )

        return wrapper

    return decorator
