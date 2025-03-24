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
    ConflictException,
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
            except UnauthorizedException as e:
                # 인증 예외 (401 Unauthorized)
                log_error(e, f"{operation_name} - 인증 오류")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={"message": str(e.detail)},
                )
            except ForbiddenException as e:
                # 권한 예외 (403 Forbidden)
                log_error(e, f"{operation_name} - 권한 오류")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"message": str(e.detail)},
                )
            except NotFoundException as e:
                # 리소스 없음 예외 (404 Not Found)
                log_error(e, f"{operation_name} - 리소스 없음")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"message": str(e.detail)},
                )
            except ValidationException as e:
                # 유효성 검증 예외 (422 Unprocessable Entity)
                log_error(e, f"{operation_name} - 데이터 유효성 오류")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"message": str(e.detail), "fields": e.error_fields},
                )
            except ConflictException as e:
                # 충돌 예외 (409 Conflict)
                log_error(e, f"{operation_name} - 데이터 충돌")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"message": str(e.detail)},
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
