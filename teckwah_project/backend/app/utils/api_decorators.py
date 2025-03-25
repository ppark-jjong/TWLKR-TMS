# app/utils/api_decorators.py
import functools
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app.utils.logger import log_error

def error_handler(operation_name: str):
    """API 엔드포인트 에러 핸들링 데코레이터"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # 모든 예외를 내부적으로 로깅
                log_error(e, f"{operation_name} 처리 중 오류 발생")
                
                # 일반적인 서버 오류로 응답
                error_message = "요청을 처리할 수 없습니다"
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                
                # 몇 가지 일반적인 예외 유형에 대해서만 다른 상태 코드 사용
                if isinstance(e, SQLAlchemyError):
                    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
                elif isinstance(e, ValueError):
                    status_code = status.HTTP_400_BAD_REQUEST
                
                raise HTTPException(
                    status_code=status_code,
                    detail={"success": False, "message": error_message}
                )
        return wrapper
    return decorator